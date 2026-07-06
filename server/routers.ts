import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

import { colaboradoresRouter } from "./routers/colaboradoresRouter";
import { itensRouter } from "./routers/itensRouter";
import { kitsRouter } from "./routers/kitsRouter";
import { pedidosRouter } from "./routers/pedidosRouter";

import { financeirosRouter } from "./routers/financeirosRouter";
import { dashboardRouter } from "./routers/dashboardRouter";
import { entregasRouter } from "./routers/entregasRouter";
import { comissoesRouter } from "./routers/comissoesRouter";

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

  // Feature routers
  colaboradores: colaboradoresRouter,
  itens: itensRouter,
  kits: kitsRouter,
  pedidos: pedidosRouter,

  financeiros: financeirosRouter,
  dashboard: dashboardRouter,
  entregas: entregasRouter,
  comissoes: comissoesRouter,
});

export type AppRouter = typeof appRouter;
