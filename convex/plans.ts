import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  },
});

/** Bulk-insert plans — used by the (mock or real) BNPL detection flow. */
export const addMany = mutation({
  args: {
    plans: v.array(v.object({
      provider: v.string(),
      itemName: v.string(),
      installment: v.number(),
      remaining: v.number(),
      nextDue: v.string(),
      apr: v.number(),
    })),
  },
  handler: async (ctx, { plans }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    for (const p of plans) await ctx.db.insert("plans", { userId, ...p });
  },
});
