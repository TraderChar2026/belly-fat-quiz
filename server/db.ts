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
