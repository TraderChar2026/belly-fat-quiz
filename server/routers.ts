import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  saveQuizSubmission,
  saveFunnelEvent,
  getSubmissions,
  getSubmissionById,
  getSubmissionsSummary,
  getAdPerformance,
  getFunnelStats,
  getFullFunnelStats,
  getDropoffByQuestion,
  getAdNames,
  saveSale,
  getSales,
  deleteSale,
  deleteSubmissions,
  getSubmissionsOverTime,
  getQuestionAnswerDistributions,
  getTrafficSources,
  getOrderClickers,
  getEmailSequenceStats,
  upsertEmailSequenceStat,
  getManualSalesSummary,
  upsertManualSalesSummary,
  getAdPerformanceTable,
} from "./db";
import { getBothVSLStats } from "./wistia";
import { computeScores, getCrmTag } from "../shared/quizData";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";

const answerSchema = z.object({
  questionId: z.number().int().min(1).max(17),
  points: z.number().int().min(0).max(3),
});

// ── Attribution schema (shared by quiz.submit and funnel.track) ───────────────
const attributionSchema = z.object({
  sessionId: z.string().max(128).optional(),
  timezone: z.string().max(64).optional(),
  adName: z.string().max(255).optional(),
  adNameRaw: z.string().max(255).optional(),
  referrerUrl: z.string().max(2048).optional(),
  referrerPlatform: z.string().max(64).optional(),
  utmSource: z.string().max(255).optional(),
  utmMedium: z.string().max(255).optional(),
  utmCampaign: z.string().max(255).optional(),
  utmId: z.string().max(255).optional(),
  utmTerm: z.string().max(255).optional(),
  fbclid: z.string().max(512).optional(),
  fbEventId: z.string().max(255).optional(),
  pageUrl: z.string().max(2048).optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Quiz ───────────────────────────────────────────────────────────────────
  quiz: router({
    submit: publicProcedure
      .input(z.object({
        fullName: z.string().min(1).max(255),
        email: z.string().email().max(320),
        phone: z.string().max(64).optional(),
        answers: z.array(answerSchema).length(17),
      }))
      .mutation(async ({ input }) => {
        const { digestiveScore, appetiteScore, gutScore, totalScore } = computeScores(input.answers);
        const crmTag = getCrmTag(totalScore);

        let ghlContactId: string | null = null;
        try {
          const ghlRes = await fetch(`${process.env.GHL_WEBHOOK_URL || ""}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fullName: input.fullName,
              email: input.email,
              phone: input.phone,
              crmTag,
              totalScore,
            }),
          }).catch(() => null);
          if (ghlRes?.ok) {
            const body = await ghlRes.json().catch(() => ({}));
            ghlContactId = body.contactId ?? null;
          }
        } catch {
          // GHL integration failure is non-fatal; submission still saved
        }

        const alertTier = totalScore <= 8 ? "Green" : totalScore <= 22 ? "Yellow" : "Red";
        const scoreBand =
          totalScore <= 8 ? "Green" :
          totalScore <= 22 ? "Yellow" :
          totalScore <= 30 ? "Lower_Red" : "Upper_Red";

        await saveQuizSubmission({
          fullName: input.fullName,
          email: input.email,
          phone: input.phone ?? null,
          answers: JSON.stringify(input.answers),
          totalScore,
          alertTier,
          scoreBand,
          digestiveScore,
          appetiteScore,
          gutScore,
          crmTag,
          ghlContactId,
        });

        return { totalScore, digestiveScore, appetiteScore, gutScore, crmTag };
      }),

    upsertGhlContact: publicProcedure
      .input(z.object({
        fullName: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        crmTag: z.string().nullable(),
        totalScore: z.number(),
      }))
      .mutation(async () => {
        return { ok: true };
      }),
  }),

  // ── Funnel Events ──────────────────────────────────────────────────────────
  funnel: router({
    track: publicProcedure
      .input(z.object({
        eventType: z.enum([
          "page_view", "quiz_start", "quiz_complete",
          "vsl_view", "vsl_25", "vsl_50", "vsl_75", "vsl_100",
          "order_click", "order_placed",
        ]),
        sessionId: z.string().max(128),
        submissionId: z.number().int().optional(),
        email: z.string().email().max(320).optional(),
        alertTier: z.string().max(32).optional(),
        scoreBand: z.string().max(32).optional(),
        vslVersion: z.enum(["red", "yel"]).optional(),
        adName: z.string().max(255).optional(),
        referrerPlatform: z.string().max(64).optional(),
        utmSource: z.string().max(255).optional(),
        utmCampaign: z.string().max(255).optional(),
        lastQuestionReached: z.number().int().min(1).max(18).optional(),
      }))
      .mutation(async ({ input }) => {
        await saveFunnelEvent({
          sessionId: input.sessionId,
          eventType: input.eventType,
          submissionId: input.submissionId,
          email: input.email,
          alertTier: input.alertTier,
          scoreBand: input.scoreBand,
          vslVersion: input.vslVersion,
          adName: input.adName,
          referrerPlatform: input.referrerPlatform,
          utmSource: input.utmSource,
          utmCampaign: input.utmCampaign,
          lastQuestionReached: input.lastQuestionReached,
        });

        // ── GHL tag: add "order clicked" when someone clicks Order Now ────────
        if (input.eventType === "order_click" && input.sessionId) {
          try {
            // Look up the GHL contact ID from the quiz submission for this session
            const { getDb } = await import("./db");
            const { eq } = await import("drizzle-orm");
            const { quizSubmissions } = await import("../drizzle/schema");
            const db = await getDb();
            if (db) {
              const rows = await db.select({
                ghlContactId: quizSubmissions.ghlContactId,
                awesomecrmContactId: quizSubmissions.awesomecrmContactId,
              }).from(quizSubmissions)
                .where(eq(quizSubmissions.sessionId, input.sessionId))
                .limit(1);
              const contactId = rows[0]?.awesomecrmContactId || rows[0]?.ghlContactId;
              if (contactId) {
                const apiKey = process.env.GHL_API_KEY || "";
                const tagRes = await fetch(`https://rest.gohighlevel.com/v1/contacts/${contactId}/tags/`, {
                  method: "POST",
                  headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ tags: ["order clicked"] }),
                });
                if (tagRes.ok) {
                  console.log(`[GHL] Added "order clicked" tag to contact ${contactId}`);
                } else {
                  const detail = await tagRes.text().catch(() => "");
                  console.warn(`[GHL] Failed to add "order clicked" tag (${tagRes.status}): ${detail.slice(0, 200)}`);
                }
              } else {
                console.warn(`[GHL] order_click: no GHL contact found for session ${input.sessionId}`);
              }
            }
          } catch (tagErr) {
            console.warn("[GHL] order_click tag error (non-fatal):", tagErr);
          }
        }

        return { ok: true };
      }),

    updateLastQuestion: publicProcedure
      .input(z.object({
        sessionId: z.string().max(128),
        questionNumber: z.number().int().min(1).max(17),
      }))
      .mutation(async ({ input }) => {
        const { updateLastQuestionReached } = await import("./db");
        await updateLastQuestionReached(input.sessionId, input.questionNumber);
        return { ok: true };
      }),
  }),
  // ── Dashboard (owner-only) ──────────────────────────────────────────────────
  dashboard: router({
    summary: protectedProcedure
      .input(z.object({
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getSubmissionsSummary(input?.dateFrom, input?.dateTo);
      }),

    adPerformance: protectedProcedure
      .input(z.object({
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getAdPerformance(input?.dateFrom, input?.dateTo);
      }),

    submissions: protectedProcedure
      .input(z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
        alertTier: z.string().optional(),
        scoreBand: z.string().optional(),
        adName: z.string().optional(),
        search: z.string().optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getSubmissions(input ?? {});
      }),

    submissionDetail: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const row = await getSubmissionById(input.id);
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });
        return row;
      }),

    deleteSubmissions: protectedProcedure
      .input(z.object({ ids: z.array(z.number().int()).min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await deleteSubmissions(input.ids);
        return { ok: true, deleted: input.ids.length };
      }),
    funnelStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getFunnelStats();
      }),

    orderClickers: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getOrderClickers();
      }),

    fullFunnelStats: protectedProcedure
      .input(z.object({
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        adName: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getFullFunnelStats(input ?? {});
      }),

    dropoffByQuestion: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getDropoffByQuestion();
      }),

    adNames: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getAdNames();
      }),

    emailStats: protectedProcedure
      .input(z.object({ tier: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getEmailSequenceStats(input?.tier);
      }),

    upsertEmailStat: protectedProcedure
      .input(z.object({
        tier: z.enum(["Red", "Yellow", "Green"]),
        emailNumber: z.number().int().min(1).max(7),
        subject: z.string().max(255).optional(),
        sentCount: z.number().int().min(0).optional(),
        openRate: z.number().min(0).max(100).optional(),
        clickRate: z.number().min(0).max(100).optional(),
        unsubCount: z.number().int().min(0).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await upsertEmailSequenceStat(input);
        return { ok: true };
      }),

    manualSales: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getManualSalesSummary();
      }),

    upsertManualSales: protectedProcedure
      .input(z.object({
        tier: z.string().max(32),
        periodLabel: z.string().max(64).optional(),
        salesCount: z.number().int().min(0),
        revenue: z.number().min(0).optional(),
        notes: z.string().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await upsertManualSalesSummary(input);
        return { ok: true };
      }),

    adPerformanceTable: protectedProcedure
      .input(z.object({
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getAdPerformanceTable(input ?? {});
      }),

    wistiaStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getBothVSLStats();
      }),
  }),

  // ── Analytics (owner-only) ───────────────────────────────────────────────────
  analytics: router({
    submissionsOverTime: protectedProcedure
      .input(z.object({ days: z.number().int().min(7).max(365).default(30) }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getSubmissionsOverTime(input?.days ?? 30);
      }),
    questionDistributions: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getQuestionAnswerDistributions();
      }),
    trafficSources: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getTrafficSources();
      }),
  }),

  // ── Sales Log (owner-only) ─────────────────────────────────────────────────
  sales: router({
    log: protectedProcedure
      .input(z.object({
        submissionId: z.number().int().optional(),
        email: z.string().email().max(320),
        fullName: z.string().max(255).optional(),
        productName: z.string().min(1).max(255),
        orderValue: z.number().min(0),
        orderDate: z.coerce.date(),
        notes: z.string().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await saveSale({
          submissionId: input.submissionId,
          email: input.email,
          fullName: input.fullName,
          productName: input.productName,
          orderValue: String(input.orderValue),
          orderDate: input.orderDate,
          notes: input.notes,
        });
        return { ok: true };
      }),

    list: protectedProcedure
      .input(z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getSales(input ?? {});
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.openId !== ENV.ownerOpenId && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await deleteSale(input.id);
        return { ok: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
