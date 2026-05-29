import { boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const quizSubmissions = mysqlTable("quiz_submissions", {
  // ── System & Identity ──────────────────────────────────────────────────────
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 128 }),          // browser session ID, links funnel events
  submissionDate: timestamp("submissionDate").defaultNow().notNull(),
  awesomecrmContactId: varchar("awesomecrmContactId", { length: 128 }), // GHL contact ID after push
  tagApplied: varchar("tagApplied", { length: 64 }),          // "Red Alert" | "Yellow Alert" | "Green Alert"
  tagAppliedAt: timestamp("tagAppliedAt"),
  isRepeatSubmission: boolean("isRepeatSubmission").default(false).notNull(),

  // ── Contact Info ───────────────────────────────────────────────────────────
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 64 }),
  timezone: varchar("timezone", { length: 64 }),
  country: varchar("country", { length: 2 }),                   // ISO 3166-1 alpha-2: "US" | "CA" | "AU" | "NZ" | "GB" etc.
  countryName: varchar("countryName", { length: 64 }),          // Full name: "United States" | "Canada" etc.

  // ── Scores ─────────────────────────────────────────────────────────────────
  totalScore: int("totalScore").notNull(),
  alertTier: varchar("alertTier", { length: 32 }).notNull(),  // "Green" | "Yellow" | "Red"
  scoreBand: varchar("scoreBand", { length: 32 }).notNull(),  // "Green" | "Yellow" | "Lower_Red" | "Upper_Red"
  digestiveScore: int("digestiveScore").notNull(),            // Q1–Q4, max 12
  appetiteScore: int("appetiteScore").notNull(),              // Q5–Q8, max 15
  gutScore: int("gutScore").notNull(),                        // Q9–Q18, max 27
  highestScoreCategory: varchar("highestScoreCategory", { length: 64 }),
  lowestScoreCategory: varchar("lowestScoreCategory", { length: 64 }),

  // ── Quiz Responses (all 18 questions stored as answer text) ───────────────
  answers: text("answers").notNull(),                         // JSON array of {questionId, points, optionIndex}
  q1Digestion: varchar("q1Digestion", { length: 255 }),
  q2Heartburn: varchar("q2Heartburn", { length: 255 }),
  q3WeightChanges: varchar("q3WeightChanges", { length: 255 }),
  q4Energy: varchar("q4Energy", { length: 255 }),
  q5AfterMeals: varchar("q5AfterMeals", { length: 255 }),
  q6EatingControl: varchar("q6EatingControl", { length: 255 }),
  q7LoseWeight: varchar("q7LoseWeight", { length: 255 }),
  q8Breakfast: varchar("q8Breakfast", { length: 255 }),
  q9Sleep: varchar("q9Sleep", { length: 255 }),
  q10BrainFog: varchar("q10BrainFog", { length: 255 }),
  q11MoodSwings: varchar("q11MoodSwings", { length: 255 }),
  q12Diet: varchar("q12Diet", { length: 255 }),
  q13FermentedFoods: varchar("q13FermentedFoods", { length: 255 }),
  q14PrebioticFoods: varchar("q14PrebioticFoods", { length: 255 }),
  q15Antacids: varchar("q15Antacids", { length: 255 }),
  q16PainPills: varchar("q16PainPills", { length: 255 }),
  q17Antibiotics: varchar("q17Antibiotics", { length: 255 }),

  // ── Ad & Traffic Attribution ───────────────────────────────────────────────
  adName: varchar("adName", { length: 255 }),                 // normalized ad name
  adNameRaw: varchar("adNameRaw", { length: 255 }),           // original raw value before normalization
  referrerUrl: text("referrerUrl"),
  referrerPlatform: varchar("referrerPlatform", { length: 64 }), // "Facebook" | "Instagram" | "Direct" | etc.
  utmSource: varchar("utmSource", { length: 255 }),
  utmMedium: varchar("utmMedium", { length: 255 }),
  utmCampaign: varchar("utmCampaign", { length: 255 }),
  utmId: varchar("utmId", { length: 255 }),
  utmContent: varchar("utmContent", { length: 512 }),
  utmTerm: varchar("utmTerm", { length: 255 }),
  fbclid: varchar("fbclid", { length: 512 }),
  fbEventId: varchar("fbEventId", { length: 255 }),
  pageUrl: text("pageUrl"),

  // ── Legacy fields (kept for backward compatibility) ────────────────────────
  crmTag: varchar("crmTag", { length: 64 }),                  // deprecated — use tagApplied
  ghlContactId: varchar("ghlContactId", { length: 128 }),     // deprecated — use awesomecrmContactId
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuizSubmission = typeof quizSubmissions.$inferSelect;
export type InsertQuizSubmission = typeof quizSubmissions.$inferInsert;

// ── Funnel Events ──────────────────────────────────────────────────────────────
export const funnelEvents = mysqlTable("funnel_events", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 128 }).notNull(),
  eventType: mysqlEnum("eventType", [
    "page_view",
    "quiz_start",
    "quiz_complete",
    "vsl_view",
    "vsl_25",
    "vsl_50",
    "vsl_75",
    "vsl_100",
    "order_click",
    "order_placed",
  ]).notNull(),
  eventTimestamp: timestamp("eventTimestamp").defaultNow().notNull(),
  submissionId: int("submissionId"),                          // populated after quiz_complete
  email: varchar("email", { length: 320 }),                   // populated after quiz_complete
  alertTier: varchar("alertTier", { length: 32 }),            // populated after quiz_complete
  scoreBand: varchar("scoreBand", { length: 32 }),            // populated after quiz_complete
  vslVersion: varchar("vslVersion", { length: 4 }),           // "A" or "B" for VSL events
  adName: varchar("adName", { length: 255 }),
  referrerPlatform: varchar("referrerPlatform", { length: 64 }),
  utmSource: varchar("utmSource", { length: 255 }),
  utmCampaign: varchar("utmCampaign", { length: 255 }),
  orderValue: decimal("orderValue", { precision: 10, scale: 2 }), // order_placed events only
  lastQuestionReached: int("lastQuestionReached"),               // for quiz_start events: last Q# reached before drop-off (1-18)
});

export type FunnelEvent = typeof funnelEvents.$inferSelect;
export type InsertFunnelEvent = typeof funnelEvents.$inferInsert;

// ── Manual Sales Log ───────────────────────────────────────────────────────────
export const salesLog = mysqlTable("sales_log", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId"),                          // links to quiz_submissions
  email: varchar("email", { length: 320 }).notNull(),
  fullName: varchar("fullName", { length: 255 }),
  productName: varchar("productName", { length: 255 }).notNull(),
  orderValue: decimal("orderValue", { precision: 10, scale: 2 }).notNull(),
  orderDate: timestamp("orderDate").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SalesLog = typeof salesLog.$inferSelect;
export type InsertSalesLog = typeof salesLog.$inferInsert;

// ── Email Sequence Stats (manual entry from AwesomeCRM) ───────────────────────
export const emailSequenceStats = mysqlTable("email_sequence_stats", {
  id: int("id").autoincrement().primaryKey(),
  tier: varchar("tier", { length: 32 }).notNull(),              // "Red" | "Yellow" | "Green"
  emailNumber: int("emailNumber").notNull(),                    // 1–7
  subject: varchar("subject", { length: 255 }),                 // email subject line label
  sentCount: int("sentCount"),
  openRate: decimal("openRate", { precision: 5, scale: 2 }),    // percentage, e.g. 42.50
  clickRate: decimal("clickRate", { precision: 5, scale: 2 }),  // percentage
  unsubCount: int("unsubCount"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailSequenceStat = typeof emailSequenceStats.$inferSelect;
export type InsertEmailSequenceStat = typeof emailSequenceStats.$inferInsert;

// ── Manual Sales Summary (manual entry for order_placed counts) ───────────────
export const manualSalesSummary = mysqlTable("manual_sales_summary", {
  id: int("id").autoincrement().primaryKey(),
  tier: varchar("tier", { length: 32 }).notNull(),              // "Red" | "Yellow" | "Green" | "All"
  periodLabel: varchar("periodLabel", { length: 64 }),          // e.g. "May 2026"
  salesCount: int("salesCount").default(0).notNull(),
  revenue: decimal("revenue", { precision: 10, scale: 2 }),
  notes: text("notes"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ManualSalesSummary = typeof manualSalesSummary.$inferSelect;
export type InsertManualSalesSummary = typeof manualSalesSummary.$inferInsert;
