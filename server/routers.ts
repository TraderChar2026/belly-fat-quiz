import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { saveQuizSubmission } from "./db";
import { computeScores, getCrmTag } from "../shared/quizData";

const answerSchema = z.object({
  questionId: z.number().int().min(1).max(17),
  points: z.number().int().min(0).max(3),
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

        // Upsert contact in GoHighLevel via MCP (server-side fetch to our own API endpoint)
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

        await saveQuizSubmission({
          fullName: input.fullName,
          email: input.email,
          phone: input.phone ?? null,
          answers: JSON.stringify(input.answers),
          totalScore,
          digestiveScore,
          appetiteScore,
          gutScore,
          crmTag,
          ghlContactId,
        });

        return {
          totalScore,
          digestiveScore,
          appetiteScore,
          gutScore,
          crmTag,
        };
      }),

    // Internal endpoint called by the GHL webhook handler
    upsertGhlContact: publicProcedure
      .input(z.object({
        fullName: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        crmTag: z.string().nullable(),
        totalScore: z.number(),
      }))
      .mutation(async ({ input }) => {
        // This procedure is called server-side only; the actual GHL call
        // happens via the /api/ghl-submit Express route to keep credentials secure.
        return { ok: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
