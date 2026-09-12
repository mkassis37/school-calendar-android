import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { protectedProcedure } from "./_core/trpc";
import { getCalendarBackup, saveCalendarBackup } from "./db";
import { z } from "zod";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  cloudSync: router({
    pull: protectedProcedure.query(async ({ ctx }) => {
      const backup = await getCalendarBackup(ctx.user.id);
      return backup ? { payload: backup.payload, updatedAt: backup.updatedAt.toISOString() } : null;
    }),
    push: protectedProcedure.input(z.object({ payload: z.string().min(2).max(5_000_000) })).mutation(async ({ ctx, input }) => {
      await saveCalendarBackup(ctx.user.id, input.payload);
      return { success: true, updatedAt: new Date().toISOString() } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
