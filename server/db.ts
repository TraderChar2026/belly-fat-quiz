import { eq, desc, asc, sql, and, gte, lte, like, or, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  quizSubmissions, InsertQuizSubmission,
  funnelEvents, InsertFunnelEvent,
  salesLog, InsertSalesLog,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Quiz Submissions ──────────────────────────────────────────────────────────

export async function saveQuizSubmission(data: InsertQuizSubmission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quizSubmissions).values(data);
  return result;
}

export async function getSubmissions(opts: {
  page?: number;
  pageSize?: number;
  alertTier?: string;
  scoreBand?: string;
  adName?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { page = 1, pageSize = 25, alertTier, scoreBand, adName, search, dateFrom, dateTo } = opts;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (alertTier) conditions.push(eq(quizSubmissions.alertTier, alertTier));
  if (scoreBand) conditions.push(eq(quizSubmissions.scoreBand, scoreBand));
  if (adName) conditions.push(eq(quizSubmissions.adName, adName));
  if (dateFrom) conditions.push(gte(quizSubmissions.submissionDate, dateFrom));
  if (dateTo) conditions.push(lte(quizSubmissions.submissionDate, dateTo));
  if (search) {
    conditions.push(
      or(
        like(quizSubmissions.fullName, `%${search}%`),
        like(quizSubmissions.email, `%${search}%`)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(quizSubmissions)
      .where(where)
      .orderBy(desc(quizSubmissions.submissionDate))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: sql<number>`COUNT(*)` }).from(quizSubmissions).where(where),
  ]);

  return { rows, total: Number(countResult[0]?.count ?? 0) };
}

export async function getSubmissionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(quizSubmissions).where(eq(quizSubmissions.id, id)).limit(1);
  return result[0] ?? null;
}

export async function checkIsRepeatSubmission(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(quizSubmissions)
    .where(eq(quizSubmissions.email, email));
  return Number(result[0]?.count ?? 0) > 0;
}

// ── Funnel Events ─────────────────────────────────────────────────────────────

export async function saveFunnelEvent(data: InsertFunnelEvent) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot save funnel event: db not available"); return; }
  try {
    await db.insert(funnelEvents).values(data);
  } catch (err) {
    console.error("[Database] Failed to save funnel event:", err);
  }
}

export async function getFunnelEventsBySession(sessionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(funnelEvents)
    .where(eq(funnelEvents.sessionId, sessionId))
    .orderBy(asc(funnelEvents.eventTimestamp));
}

export async function getFunnelStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Count distinct sessions per event type
  const rows = await db
    .select({
      eventType: funnelEvents.eventType,
      sessions: sql<number>`COUNT(DISTINCT ${funnelEvents.sessionId})`,
    })
    .from(funnelEvents)
    .groupBy(funnelEvents.eventType);

  const map: Record<string, number> = {};
  for (const r of rows) {
    map[r.eventType] = Number(r.sessions);
  }

  return {
    page_view: map["page_view"] ?? 0,
    quiz_start: map["quiz_start"] ?? 0,
    quiz_complete: map["quiz_complete"] ?? 0,
    vsl_view: map["vsl_view"] ?? 0,
    vsl_25: map["vsl_25"] ?? 0,
    vsl_50: map["vsl_50"] ?? 0,
    vsl_75: map["vsl_75"] ?? 0,
    vsl_100: map["vsl_100"] ?? 0,
    order_click: map["order_click"] ?? 0,
  };
}

// ── Dashboard Aggregates ──────────────────────────────────────────────────────

export async function getSubmissionsSummary(dateFrom?: Date, dateTo?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [];
  if (dateFrom) conditions.push(gte(quizSubmissions.submissionDate, dateFrom));
  if (dateTo) conditions.push(lte(quizSubmissions.submissionDate, dateTo));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totals, tierCounts, bandCounts, bandAvgScores] = await Promise.all([
    db.select({
      total: sql<number>`COUNT(*)`,
      uniqueEmails: sql<number>`COUNT(DISTINCT email)`,
    }).from(quizSubmissions).where(where),

    db.select({
      alertTier: quizSubmissions.alertTier,
      count: sql<number>`COUNT(*)`,
    }).from(quizSubmissions).where(where).groupBy(quizSubmissions.alertTier),

    db.select({
      scoreBand: quizSubmissions.scoreBand,
      count: sql<number>`COUNT(*)`,
    }).from(quizSubmissions).where(where).groupBy(quizSubmissions.scoreBand),

    // Per-band average scores
    db.select({
      scoreBand: quizSubmissions.scoreBand,
      avgScore: sql<number>`ROUND(AVG(totalScore), 1)`,
      minScore: sql<number>`MIN(totalScore)`,
      maxScore: sql<number>`MAX(totalScore)`,
    }).from(quizSubmissions).where(where).groupBy(quizSubmissions.scoreBand),
  ]);

  return { totals: totals[0], tierCounts, bandCounts, bandAvgScores };
}

export async function getAdPerformance(dateFrom?: Date, dateTo?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [];
  if (dateFrom) conditions.push(gte(quizSubmissions.submissionDate, dateFrom));
  if (dateTo) conditions.push(lte(quizSubmissions.submissionDate, dateTo));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db.select({
    adName: quizSubmissions.adName,
    total: sql<number>`COUNT(*)`,
    redCount: sql<number>`SUM(CASE WHEN alertTier = 'Red' THEN 1 ELSE 0 END)`,
    yellowCount: sql<number>`SUM(CASE WHEN alertTier = 'Yellow' THEN 1 ELSE 0 END)`,
    greenCount: sql<number>`SUM(CASE WHEN alertTier = 'Green' THEN 1 ELSE 0 END)`,
    avgScore: sql<number>`AVG(totalScore)`,
    firstSeen: sql<Date>`MIN(submissionDate)`,
    lastSeen: sql<Date>`MAX(submissionDate)`,
  }).from(quizSubmissions)
    .where(where)
    .groupBy(quizSubmissions.adName)
    .orderBy(desc(sql`COUNT(*)`));
}

// ── Sales Log ─────────────────────────────────────────────────────────────────

export async function saveSale(data: InsertSalesLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(salesLog).values(data);
  return result;
}

export async function getSales(opts: { page?: number; pageSize?: number } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { page = 1, pageSize = 25 } = opts;
  const offset = (page - 1) * pageSize;
  const [rows, countResult] = await Promise.all([
    db.select().from(salesLog).orderBy(desc(salesLog.orderDate)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`COUNT(*)` }).from(salesLog),
  ]);
  return { rows, total: Number(countResult[0]?.count ?? 0) };
}

export async function deleteSale(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(salesLog).where(eq(salesLog.id, id));
}

export async function deleteSubmissions(ids: number[]): Promise<void> {
  if (!ids.length) return;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(quizSubmissions).where(inArray(quizSubmissions.id, ids));
}

// ── Analytics ─────────────────────────────────────────────────────────────────

/** Submissions grouped by day for a timeline chart */
export async function getSubmissionsOverTime(days = 30) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db.select({
    day: sql<string>`DATE(submissionDate)`,
    total: sql<number>`COUNT(*)`,
    red: sql<number>`SUM(CASE WHEN alertTier = 'Red' THEN 1 ELSE 0 END)`,
    yellow: sql<number>`SUM(CASE WHEN alertTier = 'Yellow' THEN 1 ELSE 0 END)`,
    green: sql<number>`SUM(CASE WHEN alertTier = 'Green' THEN 1 ELSE 0 END)`,
  }).from(quizSubmissions)
    .where(gte(quizSubmissions.submissionDate, since))
    .groupBy(sql`DATE(submissionDate)`)
    .orderBy(asc(sql`DATE(submissionDate)`));
  return rows;
}

/** Answer frequency for each question */
export async function getQuestionAnswerDistributions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const questions = [
    { key: "q1Digestion", col: quizSubmissions.q1Digestion, label: "Q1 Digestion" },
    { key: "q2Heartburn", col: quizSubmissions.q2Heartburn, label: "Q2 Heartburn" },
    { key: "q3WeightChanges", col: quizSubmissions.q3WeightChanges, label: "Q3 Weight Changes" },
    { key: "q4Energy", col: quizSubmissions.q4Energy, label: "Q4 Energy" },
    { key: "q5AfterMeals", col: quizSubmissions.q5AfterMeals, label: "Q5 After Meals" },
    { key: "q6EatingControl", col: quizSubmissions.q6EatingControl, label: "Q6 Eating Control" },
    { key: "q7LoseWeight", col: quizSubmissions.q7LoseWeight, label: "Q7 Lose Weight" },
    { key: "q8Breakfast", col: quizSubmissions.q8Breakfast, label: "Q8 Breakfast" },
    { key: "q9Sleep", col: quizSubmissions.q9Sleep, label: "Q9 Sleep" },
    { key: "q10BrainFog", col: quizSubmissions.q10BrainFog, label: "Q10 Brain Fog" },
    { key: "q11MoodSwings", col: quizSubmissions.q11MoodSwings, label: "Q11 Mood Swings" },
    { key: "q12Diet", col: quizSubmissions.q12Diet, label: "Q12 Diet" },
    { key: "q13FermentedFoods", col: quizSubmissions.q13FermentedFoods, label: "Q13 Fermented Foods" },
    { key: "q14PrebioticFoods", col: quizSubmissions.q14PrebioticFoods, label: "Q14 Prebiotic Foods" },
    { key: "q15Antacids", col: quizSubmissions.q15Antacids, label: "Q15 Antacids" },
    { key: "q16PainPills", col: quizSubmissions.q16PainPills, label: "Q16 Pain Pills" },
    { key: "q17Antibiotics", col: quizSubmissions.q17Antibiotics, label: "Q17 Antibiotics" },
  ] as const;

  const results: { key: string; label: string; answers: { answer: string; count: number }[] }[] = [];
  for (const q of questions) {
    const rows = await db.select({
      answer: q.col,
      count: sql<number>`COUNT(*)`,
    }).from(quizSubmissions)
      .where(sql`${q.col} IS NOT NULL`)
      .groupBy(q.col)
      .orderBy(desc(sql`COUNT(*)`));
    results.push({ key: q.key, label: q.label, answers: rows.map(r => ({ answer: r.answer ?? "", count: Number(r.count) })) });
  }
  return results;
}

/** Order clickers: funnel_events of type order_click joined to quiz_submissions via sessionId */
export async function getOrderClickers(limit = 200) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({
      eventId: funnelEvents.id,
      clickedAt: funnelEvents.eventTimestamp,
      sessionId: funnelEvents.sessionId,
      adName: sql<string>`COALESCE(${quizSubmissions.utmMedium}, ${funnelEvents.adName}, ${quizSubmissions.adName})`,
      utmSource: sql<string>`COALESCE(${funnelEvents.utmSource}, ${quizSubmissions.utmSource})`,
      utmCampaign: sql<string>`COALESCE(${funnelEvents.utmCampaign}, ${quizSubmissions.utmCampaign})`,
      alertTier: sql<string>`COALESCE(${funnelEvents.alertTier}, ${quizSubmissions.alertTier})`,
      scoreBand: sql<string>`COALESCE(${funnelEvents.scoreBand}, ${quizSubmissions.scoreBand})`,
      fullName: quizSubmissions.fullName,
      email: quizSubmissions.email,
      phone: quizSubmissions.phone,
      totalScore: quizSubmissions.totalScore,
      ghlContactId: quizSubmissions.ghlContactId,
      country: quizSubmissions.country,
      countryName: quizSubmissions.countryName,
    })
    .from(funnelEvents)
    .leftJoin(quizSubmissions, eq(funnelEvents.sessionId, quizSubmissions.sessionId))
    .where(eq(funnelEvents.eventType, "order_click"))
    .orderBy(desc(funnelEvents.eventTimestamp))
    .limit(limit);
  return rows;
}

/** Top traffic sources */
export async function getTrafficSources() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [platformRows, utmSourceRows, utmMediumRows] = await Promise.all([
    db.select({
      platform: quizSubmissions.referrerPlatform,
      count: sql<number>`COUNT(*)`,
    }).from(quizSubmissions).groupBy(quizSubmissions.referrerPlatform).orderBy(desc(sql`COUNT(*)`)),
    db.select({
      source: quizSubmissions.utmSource,
      count: sql<number>`COUNT(*)`,
    }).from(quizSubmissions).where(sql`utmSource IS NOT NULL`).groupBy(quizSubmissions.utmSource).orderBy(desc(sql`COUNT(*)`)),
    db.select({
      medium: quizSubmissions.utmMedium,
      count: sql<number>`COUNT(*)`,
    }).from(quizSubmissions).where(sql`utmMedium IS NOT NULL`).groupBy(quizSubmissions.utmMedium).orderBy(desc(sql`COUNT(*)`)),
  ]);
  return { platformRows, utmSourceRows, utmMediumRows };
}

// ── Full Funnel Stats (with optional date range and ad name filter) ────────────

export async function getFullFunnelStats(opts: {
  dateFrom?: Date;
  dateTo?: Date;
  adName?: string;
} = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { dateFrom, dateTo, adName } = opts;

  // Build conditions for funnel_events
  const eventConditions = [];
  if (dateFrom) eventConditions.push(gte(funnelEvents.eventTimestamp, dateFrom));
  if (dateTo) eventConditions.push(lte(funnelEvents.eventTimestamp, dateTo));

  // For ad name filter we need to join to quiz_submissions
  // We'll do two separate queries: one for events, one for submissions
  const subConditions = [];
  if (dateFrom) subConditions.push(gte(quizSubmissions.submissionDate, dateFrom));
  if (dateTo) subConditions.push(lte(quizSubmissions.submissionDate, dateTo));
  if (adName) {
    // filter by utmMedium (actual ad name for Facebook) or adName
    subConditions.push(
      or(
        eq(quizSubmissions.utmMedium, adName),
        eq(quizSubmissions.adName, adName)
      )
    );
  }

  // Get sessions that match the ad name filter (for cross-referencing events)
  let filteredSessionIds: string[] | null = null;
  if (adName) {
    const sessions = await db
      .select({ sessionId: quizSubmissions.sessionId })
      .from(quizSubmissions)
      .where(and(...subConditions));
    filteredSessionIds = sessions.map(s => s.sessionId).filter(Boolean) as string[];
    if (filteredSessionIds.length === 0) {
      return {
        page_view: 0, quiz_start: 0, quiz_complete: 0,
        vsl_view: 0, vsl_25: 0, vsl_50: 0, vsl_75: 0, vsl_100: 0,
        order_click: 0, order_placed: 0,
        red_complete: 0, yellow_complete: 0, green_complete: 0,
      };
    }
    eventConditions.push(inArray(funnelEvents.sessionId, filteredSessionIds));
  }

  const eventWhere = eventConditions.length > 0 ? and(...eventConditions) : undefined;
  const subWhere = subConditions.length > 0 ? and(...subConditions) : undefined;

  const [eventRows, tierRows] = await Promise.all([
    db.select({
      eventType: funnelEvents.eventType,
      sessions: sql<number>`COUNT(DISTINCT ${funnelEvents.sessionId})`,
    })
      .from(funnelEvents)
      .where(eventWhere)
      .groupBy(funnelEvents.eventType),

    db.select({
      alertTier: quizSubmissions.alertTier,
      count: sql<number>`COUNT(*)`,
    })
      .from(quizSubmissions)
      .where(subWhere)
      .groupBy(quizSubmissions.alertTier),
  ]);

  const map: Record<string, number> = {};
  for (const r of eventRows) map[r.eventType] = Number(r.sessions);

  const tierMap: Record<string, number> = {};
  for (const r of tierRows) tierMap[r.alertTier] = Number(r.count);

  return {
    page_view: map["page_view"] ?? 0,
    quiz_start: map["quiz_start"] ?? 0,
    quiz_complete: map["quiz_complete"] ?? 0,
    vsl_view: map["vsl_view"] ?? 0,
    vsl_25: map["vsl_25"] ?? 0,
    vsl_50: map["vsl_50"] ?? 0,
    vsl_75: map["vsl_75"] ?? 0,
    vsl_100: map["vsl_100"] ?? 0,
    order_click: map["order_click"] ?? 0,
    order_placed: map["order_placed"] ?? 0,
    red_complete: tierMap["Red"] ?? 0,
    yellow_complete: tierMap["Yellow"] ?? 0,
    green_complete: tierMap["Green"] ?? 0,
  };
}

/** Drop-off by question: for each question 1-18, count sessions that reached it but did not complete */
export async function getDropoffByQuestion() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all quiz_start events that have a lastQuestionReached set
  const rows = await db
    .select({
      lastQuestionReached: funnelEvents.lastQuestionReached,
      count: sql<number>`COUNT(DISTINCT ${funnelEvents.sessionId})`,
    })
    .from(funnelEvents)
    .where(
      and(
        eq(funnelEvents.eventType, "quiz_start"),
        sql`${funnelEvents.lastQuestionReached} IS NOT NULL`
      )
    )
    .groupBy(funnelEvents.lastQuestionReached)
    .orderBy(asc(funnelEvents.lastQuestionReached));

  // Also get sessions that completed (so we can show completions per question)
  const completedSessions = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${funnelEvents.sessionId})` })
    .from(funnelEvents)
    .where(eq(funnelEvents.eventType, "quiz_complete"));

  const completions = Number(completedSessions[0]?.count ?? 0);

  return {
    byQuestion: rows.map(r => ({
      question: Number(r.lastQuestionReached),
      droppedOff: Number(r.count),
    })),
    completions,
  };
}

/** Get all distinct ad names for the filter dropdown */
export async function getAdNames() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .selectDistinct({
      adName: sql<string>`COALESCE(NULLIF(${quizSubmissions.utmMedium}, ''), NULLIF(${quizSubmissions.adName}, ''), 'Direct / Unknown')`,
    })
    .from(quizSubmissions)
    .orderBy(sql`COALESCE(NULLIF(${quizSubmissions.utmMedium}, ''), NULLIF(${quizSubmissions.adName}, ''), 'Direct / Unknown')`);
  return rows.map(r => r.adName).filter(Boolean);
}

// ── Email Sequence Stats ──────────────────────────────────────────────────────

import { emailSequenceStats, manualSalesSummary, InsertEmailSequenceStat, InsertManualSalesSummary } from "../drizzle/schema";

export async function getEmailSequenceStats(tier?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const where = tier ? eq(emailSequenceStats.tier, tier) : undefined;
  return db.select().from(emailSequenceStats)
    .where(where)
    .orderBy(asc(emailSequenceStats.tier), asc(emailSequenceStats.emailNumber));
}

export async function upsertEmailSequenceStat(data: {
  tier: string;
  emailNumber: number;
  subject?: string;
  sentCount?: number;
  openRate?: number;
  clickRate?: number;
  unsubCount?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if row exists
  const existing = await db.select({ id: emailSequenceStats.id })
    .from(emailSequenceStats)
    .where(and(eq(emailSequenceStats.tier, data.tier), eq(emailSequenceStats.emailNumber, data.emailNumber)))
    .limit(1);

  if (existing.length > 0) {
    await db.update(emailSequenceStats)
      .set({
        subject: data.subject,
        sentCount: data.sentCount ?? null,
        openRate: data.openRate != null ? String(data.openRate) as any : null,
        clickRate: data.clickRate != null ? String(data.clickRate) as any : null,
        unsubCount: data.unsubCount ?? null,
      })
      .where(eq(emailSequenceStats.id, existing[0].id));
  } else {
    await db.insert(emailSequenceStats).values({
      tier: data.tier,
      emailNumber: data.emailNumber,
      subject: data.subject,
      sentCount: data.sentCount ?? null,
      openRate: data.openRate != null ? String(data.openRate) as any : null,
      clickRate: data.clickRate != null ? String(data.clickRate) as any : null,
      unsubCount: data.unsubCount ?? null,
    });
  }
}

// ── Manual Sales Summary ──────────────────────────────────────────────────────

export async function getManualSalesSummary() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(manualSalesSummary)
    .orderBy(desc(manualSalesSummary.updatedAt));
}

export async function upsertManualSalesSummary(data: {
  tier: string;
  periodLabel?: string;
  salesCount: number;
  revenue?: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select({ id: manualSalesSummary.id })
    .from(manualSalesSummary)
    .where(eq(manualSalesSummary.tier, data.tier))
    .limit(1);

  if (existing.length > 0) {
    await db.update(manualSalesSummary)
      .set({
        periodLabel: data.periodLabel,
        salesCount: data.salesCount,
        revenue: data.revenue != null ? String(data.revenue) as any : null,
        notes: data.notes,
      })
      .where(eq(manualSalesSummary.id, existing[0].id));
  } else {
    await db.insert(manualSalesSummary).values({
      tier: data.tier,
      periodLabel: data.periodLabel,
      salesCount: data.salesCount,
      revenue: data.revenue != null ? String(data.revenue) as any : null,
      notes: data.notes,
    });
  }
}

// ── Ad Performance Table ──────────────────────────────────────────────────────
// Returns one row per distinct ad name with full funnel counts and conversion rates.
// Joins funnel_events with quiz_submissions on sessionId to resolve ad names,
// since ad names are stored in quiz_submissions (via utm_medium) not funnel_events.
export async function getAdPerformanceTable(opts?: {
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions: ReturnType<typeof and>[] = [];
  if (opts?.dateFrom) conditions.push(gte(funnelEvents.eventTimestamp, opts.dateFrom));
  if (opts?.dateTo) conditions.push(lte(funnelEvents.eventTimestamp, opts.dateTo));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Join funnel_events with quiz_submissions to get the ad name per session.
  // quiz_submissions stores the ad name from utm_medium (Facebook ads pass ad name via utm_medium).
  // funnelEvents.adName is a fallback for sessions that never completed the quiz.
  const rows = await db
    .select({
      adName: sql<string>`COALESCE(
        ${quizSubmissions.utmMedium},
        ${quizSubmissions.adName},
        ${funnelEvents.adName},
        'Direct / Unknown'
      )`,
      eventType: funnelEvents.eventType,
      sessionId: funnelEvents.sessionId,
    })
    .from(funnelEvents)
    .leftJoin(quizSubmissions, eq(funnelEvents.sessionId, quizSubmissions.sessionId))
    .where(where ?? sql`1=1`);

  // Aggregate in JS — group by adName, count unique sessions per event type
  const adMap = new Map<string, {
    sessions: Set<string>;
    page_view: Set<string>;
    quiz_start: Set<string>;
    quiz_complete: Set<string>;
    vsl_view: Set<string>;
    order_click: Set<string>;
  }>();

  for (const row of rows) {
    const key = row.adName || "Direct / Unknown";
    if (!adMap.has(key)) {
      adMap.set(key, {
        sessions: new Set(),
        page_view: new Set(),
        quiz_start: new Set(),
        quiz_complete: new Set(),
        vsl_view: new Set(),
        order_click: new Set(),
      });
    }
    const entry = adMap.get(key)!;
    if (row.sessionId) {
      entry.sessions.add(row.sessionId);
      const et = row.eventType as string;
      if (et === "page_view") entry.page_view.add(row.sessionId);
      else if (et === "quiz_start") entry.quiz_start.add(row.sessionId);
      else if (et === "quiz_complete") entry.quiz_complete.add(row.sessionId);
      else if (et === "vsl_view") entry.vsl_view.add(row.sessionId);
      else if (et === "order_click") entry.order_click.add(row.sessionId);
    }
  }

  const pct = (num: number, den: number) =>
    den > 0 ? Math.round((num / den) * 1000) / 10 : 0;

  const result = Array.from(adMap.entries()).map(([adName, e]) => {
    const visits = e.page_view.size;
    const starts = e.quiz_start.size;
    const completes = e.quiz_complete.size;
    const vslViews = e.vsl_view.size;
    const orderClicks = e.order_click.size;
    return {
      adName,
      visits,
      starts,
      completes,
      vslViews,
      orderClicks,
      startRate: pct(starts, visits),
      completeRate: pct(completes, starts),
      vslRate: pct(vslViews, completes),
      orderRate: pct(orderClicks, visits),   // visit-to-order is the key metric
    };
  });

  // Sort by visits descending by default
  result.sort((a, b) => b.visits - a.visits);
  return result;
}
