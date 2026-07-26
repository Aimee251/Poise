import { action, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

/**
 * AI price-forecast feature — for "other"-category wants only.
 * Rate-limited to DAILY_LIMIT calls per user per day, checked server-side.
 *
 * Usage is checked BEFORE the API call (so we never exceed the limit) but
 * only INCREMENTED after a successful, parsed response — a failed call
 * (bad key, network error, API outage) doesn't cost the user a use.
 *
 * Setup required: set GEMINI_API_KEY in the Convex dashboard
 * (Settings -> Environment Variables). Get a key at aistudio.google.com/apikey.
 * Never in client code or .env.local — same rule as any other server secret.
 *
 * Model name: Gemini model strings change often. GEMINI_MODEL below is a
 * single constant to update — check https://ai.google.dev/gemini-api/docs/models
 * for the current recommended fast/cheap model before shipping.
 */
const DAILY_LIMIT = 3;
const GEMINI_MODEL = "gemini-3.5-flash";
const todayStr = () => new Date().toISOString().slice(0, 10);

export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { used: 0, limit: DAILY_LIMIT };
    const row = await ctx.db.query("aiUsage")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", todayStr()))
      .unique();
    return { used: row?.count ?? 0, limit: DAILY_LIMIT };
  },
});

/** Read-only check: has this user hit today's limit? Does NOT increment. */
export const _checkUsage = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const row = await ctx.db.query("aiUsage")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", todayStr()))
      .unique();
    const used = row?.count ?? 0;
    return { allowed: used < DAILY_LIMIT, used };
  },
});

/** Called ONLY after a successful, parsed AI response — this is what spends a use. */
export const _commitUsage = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const date = todayStr();
    const row = await ctx.db.query("aiUsage")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();
    const used = row?.count ?? 0;
    if (row) await ctx.db.patch(row._id, { count: used + 1 });
    else await ctx.db.insert("aiUsage", { userId, date, count: 1 });
    return used + 1;
  },
});

export const _saveForecast = internalMutation({
  args: {
    wantId: v.id("wants"),
    userId: v.id("users"),
    forecast: v.object({
      trend: v.union(v.literal("up"), v.literal("down"), v.literal("flat")),
      pctChange6mo: v.number(),
      confidence: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      reasoning: v.string(),
      generatedAt: v.number(),
    }),
  },
  handler: async (ctx, { wantId, userId, forecast }) => {
    const want = await ctx.db.get(wantId);
    if (!want || want.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(wantId, { aiForecast: forecast });
  },
});

export const predictPrice = action({
  args: { wantId: v.id("wants"), itemName: v.string(), price: v.number() },
  handler: async (ctx, { wantId, itemName, price }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const check = await ctx.runMutation((internal.ai as any)._checkUsage, { userId });
    if (!check.allowed) {
      throw new Error(`You've used all ${DAILY_LIMIT} AI forecasts for today — come back tomorrow.`);
    }



    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("AI forecasting isn't configured yet (missing GEMINI_API_KEY).");

    const prompt = `You are a cautious pricing analyst. For an item called "${itemName}" ` +
      `currently priced at $${price}, estimate how its price is likely to move over the next ` +
      `6 months. Be honest about uncertainty — if there's no real basis for a prediction, say so ` +
      `with low confidence and a near-zero change. Respond with a JSON object matching the requested schema.`;

    let data;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  trend: { type: "STRING", enum: ["up", "down", "flat"] },
                  pct_change_6mo: { type: "NUMBER" },
                  confidence: { type: "STRING", enum: ["low", "medium", "high"] },
                  reasoning: { type: "STRING" }
                },
                required: ["trend", "pct_change_6mo", "confidence", "reasoning"]
              },
              maxOutputTokens: 2048,
              temperature: 0.4
            },

          }),
        }
      );
      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`AI request failed (${res.status}): ${errorText}`);
      }
      data = await res.json();
    } catch (err: any) {
      console.error("AI service fetch error:", err);
      throw new Error(`Couldn't reach the AI service: ${err.message || err}`);
    }




    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    console.log("AI Raw Text Response:", text);
    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch (err: any) {
      console.error("AI JSON Parse Error:", err, "Raw text:", text);
      parsed = { trend: "flat", pct_change_6mo: 0, confidence: "low", reasoning: "Could not parse a forecast." };
    }


    const forecast = {
      trend: parsed.trend === "up" || parsed.trend === "down" ? parsed.trend : "flat",
      pctChange6mo: Number(parsed.pct_change_6mo) || 0,
      confidence: ["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "low",
      reasoning: String(parsed.reasoning || "").slice(0, 200),
      generatedAt: Date.now(),
    };

    const used = await ctx.runMutation((internal.ai as any)._commitUsage, { userId });
    await ctx.runMutation((internal.ai as any)._saveForecast, { wantId, userId, forecast });
    return { ...forecast, usesRemaining: DAILY_LIMIT - used };
  },
});

