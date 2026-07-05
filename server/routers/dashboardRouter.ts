import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { z } from "zod";
import { pedidos, clientes, colaboradores } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const dashboardRouter = router({
  getPedidosCalendario: protectedProcedure
    .input(
      z.object({
        mes: z.number().int().min(1).max(12),
        ano: z.number().int().min(2000).max(2100),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Calcular intervalo de datas
      const dataInicio = new Date(input.ano, input.mes - 1, 1);
      const dataFim = new Date(input.ano, input.mes, 0, 23, 59, 59);

      // Buscar pedidos no período com joins para clientes e colaboradores
      const result = await db
        .select({
          id: pedidos.id,
          status: pedidos.status,
          dataEvento: pedidos.dataEvento,
          nomeCliente: clientes.nome,
          nomeColaborador: colaboradores.nome,
          valorTotal: pedidos.valorTotal,
        })
        .from(pedidos)
        .leftJoin(clientes, eq(pedidos.clienteId, clientes.id))
        .innerJoin(colaboradores, eq(pedidos.colaboradorId, colaboradores.id))
        .where(
          and(
            gte(pedidos.dataEvento, dataInicio),
            lte(pedidos.dataEvento, dataFim),
            isNotNull(pedidos.dataEvento)
          )
        );

      return result;
    }),
});
