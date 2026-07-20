import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("wants")
      .withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    cat: v.union(v.literal("luxury"), v.literal("tech"),
                 v.literal("seasonal"), v.literal("other")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("wants", { userId, ...args, watching: false });
  },
});

export const setWatching = mutation({
  args: { id: v.id("wants"), watching: v.boolean() },
  handler: async (ctx, { id, watching }) => {
    const userId = await getAuthUserId(ctx);
    const want = await ctx.db.get(id);
    if (!want || want.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { watching });
  },
});

export const remove = mutation({
  args: { id: v.id("wants") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    const want = await ctx.db.get(id);
    if (!want || want.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

export const recordOpen = mutation({
  args: { id: v.id("wants") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    const want = await ctx.db.get(id);
    if (!want || want.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, {
      views: (want.views ?? 0) + 1,
      lastOpenedAt: Date.now(),
    });
  },
});
