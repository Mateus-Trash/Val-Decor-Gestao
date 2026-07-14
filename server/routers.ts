import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { verifyPassword } from "./_core/authUtils";
import { signToken } from "./_core/authUtils";
import { getUserByEmail } from "./db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { colaboradoresRouter } from "./routers/colaboradoresRouter";
import { itensRouter } from "./routers/itensRouter";
import { kitsRouter } from "./routers/kitsRouter";
import { pedidosRouter } from "./routers/pedidosRouter";
import { financeirosRouter } from "./routers/financeirosRouter";
import { dashboardRouter } from "./routers/dashboardRouter";
import { entregasRouter } from "./routers/entregasRouter";
import { comissoesRouter } from "./routers/comissoesRouter";
import { importacaoRouter } from "./routers/importacaoRouter";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return null;
      const { passwordHash, ...safeUser } = ctx.user;
      return {
        ...safeUser,
        colaboradorId: ctx.colaborador?.id ?? null,
        colaboradorNome: ctx.colaborador?.nome ?? null,
      };
    }),
    login: publicProcedure
      .input(z.object({ email: z.string().email(), senha: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos" });
        }
        const valid = await verifyPassword(input.senha, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos" });
        }
        const token = signToken(user.id);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Feature routers
  colaboradores: colaboradoresRouter,
  itens: itensRouter,
  kits: kitsRouter,
  pedidos: pedidosRouter,
  financeiros: financeirosRouter,
  dashboard: dashboardRouter,
  entregas: entregasRouter,
  comissoes: comissoesRouter,
  importacao: importacaoRouter,
});

export type AppRouter = typeof appRouter;
