import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// authTables provides: users, authAccounts, authSessions, etc.
// Account linking by verified email is handled by Convex Auth: a Google
// sign-in whose (verified) email matches an existing user attaches to that
// user instead of creating a duplicate.
export default defineSchema({
  ...authTables,

  profiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    // baseline
    income: v.number(),
    burn: v.number(),
    savings: v.number(),
    // decision settings — value judgments, user-owned
    piMax: v.number(),          // acceptable crunch probability (0.05/0.10/0.20)
    kappaWk: v.number(),        // $/week impatience
    bufferMonths: v.number(),   // 1 = buffer breach, 0 = hitting $0
  }).index("by_user", ["userId"]),

  wants: defineTable({
    userId: v.id("users"),
    name: v.string(),
    price: v.number(),
    cat: v.union(v.literal("luxury"), v.literal("tech"),
                 v.literal("seasonal"), v.literal("other")),
    watching: v.boolean(),      // "remind me at the window"
    views: v.optional(v.number()),       // count of detail view opens
    lastOpenedAt: v.optional(v.number()),// timestamp of last open
    storageId: v.optional(v.id("_storage")), // Convex file storage ID
    aiForecast: v.optional(
      v.object({
        trend: v.union(v.literal("up"), v.literal("down"), v.literal("flat")),
        pctChange6mo: v.number(),
        confidence: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
        reasoning: v.string(),
        generatedAt: v.number(),
      })
    ),
  }).index("by_user", ["userId"]),

  plans: defineTable({
    userId: v.id("users"),
    provider: v.string(),       // Klarna / Afterpay / Affirm / ...
    itemName: v.string(),
    installment: v.number(),
    remaining: v.number(),
    nextDue: v.string(),        // ISO date
    apr: v.number(),
  }).index("by_user", ["userId"]),

  aiUsage: defineTable({
    userId: v.id("users"),
    date: v.string(),
    count: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  // signup rate-limit log (IP = abuse throttle, never identity)
  signupEvents: defineTable({
    ip: v.string(),
    at: v.number(),
  }).index("by_ip", ["ip"]),
});

