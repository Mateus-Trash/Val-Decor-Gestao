import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { clientesRouter } from "./routers/clientes";
import { colaboradoresRouter } from "./routers/colaboradoresRouter";
import { itensRouter } from "./routers/itens";
import { kitsRouter } from "./routers/kits";
import { pedidosRouter } from "./routers/pedidos";
import { transacoesFinanceirasRouter } from "./routers/transacoesFinanceiras";
import { comissoesRouter } from "./routers/comissoes";
import { entregasColetasRouter } from "./routers/entregasColetas";

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
  clientes: clientesRouter,
  colaboradores: colaboradoresRouter,
  itens: itensRouter,
  kits: kitsRouter,
  pedidos: pedidosRouter,
  transacoesFinanceiras: transacoesFinanceirasRouter,
  comissoes: comissoesRouter,
  entregasColetas: entregasColetasRouter,
});

export type AppRouter = typeof appRouter;
