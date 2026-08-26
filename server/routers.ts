import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getDreamDexSnapshot } from "./dreamdex";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  dreamdex: router({
    /** Public, read-only Event Contract snapshot. It never receives wallet or signer material. */
    snapshot: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(6).optional() }).nullish())
      .query(({ input }) => getDreamDexSnapshot(input?.limit ?? 3)),
  }),

  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
