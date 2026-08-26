import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getDreamDexSnapshot } from "./dreamdex";
import { getDb } from "./db";
import {
  createDecisionReceipt,
  createForecastRevision,
  getCalibrationMetrics,
  getDecisionReceipt,
  listPendingResolutionEvidence,
  listDecisionReceipts,
  submitResolutionEvidence,
  verifyResolutionEvidence,
} from "./receipts";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";

export const receiptInputSchema = z.object({
  marketId: z.string().trim().min(1).max(128),
  direction: z.enum(["UP", "DOWN"]),
  probabilityBps: z.number().int().min(100).max(9_900),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  thesis: z.string().trim().min(1).max(2_000),
  counterThesis: z.string().trim().min(1).max(2_000),
});

export const revisionInputSchema = receiptInputSchema.omit({ marketId: true });

export const resolutionEvidenceInputSchema = z.object({
  receiptId: z.number().int().positive(),
  outcome: z.enum(["YES", "NO", "VOID"]),
  sourceUrl: z.string().url().max(2_048),
  evidenceSummary: z.string().trim().min(1).max(4_000),
});

export const resolutionReviewInputSchema = z.object({
  resolutionId: z.number().int().positive(),
  status: z.enum(["VERIFIED", "REJECTED"]),
});

function receiptError(error: unknown, fallback: string): TRPCError {
  const message = error instanceof Error ? error.message : fallback;
  const isClientError = [
    "Selected market was not present",
    "A fresh verified market snapshot is required",
    "A receipt can only be committed",
    "Decision Receipt not found",
    "Only submitted resolution evidence can be reviewed",
    "Resolution evidence not found",
    "Evidence source",
  ].some(prefix => message.startsWith(prefix));
  return new TRPCError({ code: isClientError ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR", message });
}

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

  dreamdex: router({
    /** Public, read-only Event Contract snapshot. It never receives wallet or signer material. */
    snapshot: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(6).optional() }).nullish())
      .query(({ input }) => getDreamDexSnapshot(input?.limit ?? 3)),
  }),

  receipts: router({
    create: protectedProcedure.input(receiptInputSchema).mutation(async ({ ctx, input }) => {
      try {
        const snapshot = await getDreamDexSnapshot(6);
        return await createDecisionReceipt(ctx.user.id, input, snapshot);
      } catch (error) {
        throw receiptError(error, "Unable to create Decision Receipt");
      }
    }),
    revise: protectedProcedure
      .input(z.object({ receiptId: z.number().int().positive(), ...revisionInputSchema.shape }))
      .mutation(async ({ ctx, input }) => {
        try {
          const { receiptId, ...revision } = input;
          return await createForecastRevision(ctx.user.id, receiptId, revision);
        } catch (error) {
          throw receiptError(error, "Unable to revise Decision Receipt");
        }
      }),
    submitResolutionEvidence: protectedProcedure
      .input(resolutionEvidenceInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await submitResolutionEvidence(ctx.user.id, input);
        } catch (error) {
          throw receiptError(error, "Unable to submit resolution evidence");
        }
      }),
    metrics: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await getCalibrationMetrics(ctx.user.id);
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Unable to calculate calibration metrics" });
      }
    }),
    pendingReview: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
      .query(async ({ input }) => {
        try {
          return await listPendingResolutionEvidence(input?.limit ?? 50);
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Unable to load review queue" });
        }
      }),
    verifyResolutionEvidence: adminProcedure
      .input(resolutionReviewInputSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await verifyResolutionEvidence(ctx.user.id, input.resolutionId, input.status);
        } catch (error) {
          throw receiptError(error, "Unable to review resolution evidence");
        }
      }),
    listMine: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
      .query(async ({ ctx, input }) => {
        try {
          return await listDecisionReceipts(ctx.user.id, input?.limit ?? 25);
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Unable to list Decision Receipts" });
        }
      }),
    getMineById: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        try {
          const receipt = await getDecisionReceipt(ctx.user.id, input.id);
          if (!receipt) throw new TRPCError({ code: "NOT_FOUND", message: "Decision Receipt not found" });
          return receipt;
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Unable to read Decision Receipt" });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
