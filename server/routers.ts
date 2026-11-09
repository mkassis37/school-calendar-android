import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { protectedProcedure } from "./_core/trpc";
import { getCalendarBackup, saveCalendarBackup } from "./db";
import { z } from "zod";

const cloudEventSchema = z.object({
  id: z.string().min(1).max(100), title: z.string().min(1).max(200), subject: z.string().max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  type: z.enum(["lesson", "homework", "exam", "evaluation", "activity"]), done: z.boolean(),
  reminderMinutes: z.number().int().min(0).max(10080), notes: z.string().max(10000).optional(), repeatWeekly: z.boolean().optional(),
});
const cloudPayloadSchema = z.object({
  format: z.literal("school-calendar"), version: z.literal(1), exportedAt: z.string().max(100),
  events: z.array(cloudEventSchema).max(5000), subjectColors: z.record(z.string().min(1).max(100), z.string().regex(/^#[0-9A-Fa-f]{6}$/)).refine((value) => Object.keys(value).length <= 200),
  reminderDefaults: z.union([
    z.object({ homework: z.number().int().min(0).max(10080), exam: z.number().int().min(0).max(10080) }),
    z.object({
      lesson: z.array(z.number().int().min(0).max(10080)).max(8),
      homework: z.array(z.number().int().min(0).max(10080)).max(8),
      exam: z.array(z.number().int().min(0).max(10080)).max(8),
      evaluation: z.array(z.number().int().min(0).max(10080)).max(8),
      activity: z.array(z.number().int().min(0).max(10080)).max(8),
    }),
  ]),
});

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
      const parsed = JSON.parse(input.payload) as unknown;
      cloudPayloadSchema.parse(parsed);
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
