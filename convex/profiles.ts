import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Current user's profile, or null if onboarding hasn't happened yet.
 *  The client uses `null` to route new users into onboarding. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId)).unique();
  },
});

/** Create the profile at the end of onboarding, or update it from the
 *  Profile tab. Idempotent: one profile per user. */
export const upsert = mutation({
  args: {
    name: v.string(),
    income: v.number(),
    burn: v.number(),
    savings: v.number(),
    piMax: v.number(),
    kappaWk: v.number(),
    bufferMonths: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("profiles", { userId, ...args });
  },
});
