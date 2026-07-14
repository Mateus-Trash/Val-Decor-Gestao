import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { itens, kitItens, kits } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { getReservadoPorItemNaData } from "../estoqueUtils";

export const kitsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    // Buscar todos os kits ordenados por nome
    const todosKits = await db.select().from(kits).orderBy(asc(kits.nome));

    // Para cada kit, buscar os itens compostos via join
    const kitsComItens = await Promise.all(
      todosKits.map(async (kit) => {
        const composicao = await db
          .select({
            itemId: kitItens.itemId,
            nome: itens.nome,
            quantidade: kitItens.quantidade,
          })
          .from(kitItens)
          .innerJoin(itens, eq(kitItens.itemId, itens.id))
          .where(eq(kitItens.kitId, kit.id));

        return { ...kit, itens: composicao };
      })
    );

    return kitsComItens;
  }),

  create: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        descricao: z.string().optional(),
        categoria: z.enum(["Decoracoes", "Cadeiras e Mesas", "Toalhas"]).optional(),
        valorAluguel: z.number().int().positive("Valor de aluguel deve ser positivo"),
        itens: z.array(
          z.object({
            itemId: z.number().int().positive(),
            quantidade: z.number().int().positive(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(kits).values({
        nome: input.nome,
        descricao: input.descricao,
        categoria: input.categoria,
        valorAluguel: input.valorAluguel,
      });

      const kitId = Number(result[0].insertId);

      if (input.itens.length > 0) {
        await db.insert(kitItens).values(
          input.itens.map((item) => ({
            kitId,
            itemId: item.itemId,
            quantidade: item.quantidade,
          }))
        );
      }

      return { kitId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        nome: z.string().min(1).optional(),
        descricao: z.string().optional(),
        categoria: z.enum(["Decoracoes", "Cadeiras e Mesas", "Toalhas"]).optional(),
        valorAluguel: z.number().int().positive().optional(),
        itens: z
          .array(
            z.object({
              itemId: z.number().int().positive(),
              quantidade: z.number().int().positive(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, itens: novosItens, ...campos } = input;

      // Atualizar campos do kit se houver
      if (Object.keys(campos).length > 0) {
        await db.update(kits).set(campos).where(eq(kits.id, id));
      }

      // Se itens foram enviados: deletar todos e reinserir
      if (novosItens !== undefined) {
        await db.delete(kitItens).where(eq(kitItens.kitId, id));

        if (novosItens.length > 0) {
          await db.insert(kitItens).values(
            novosItens.map((item) => ({
              kitId: id,
              itemId: item.itemId,
              quantidade: item.quantidade,
            }))
          );
        }
      }

      return { id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Deletar kitItens primeiro, depois o kit
      await db.delete(kitItens).where(eq(kitItens.kitId, input.id));
      return db.delete(kits).where(eq(kits.id, input.id));
    }),

  checkAvailability: protectedProcedure
    .input(z.object({ kitId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { disponivel: false, itensFaltando: [] };

      // Buscar todos os itens do kit com quantidadeDisponivel
      const composicao = await db
        .select({
          itemId: kitItens.itemId,
          nomeItem: itens.nome,
          quantidadeNecessaria: kitItens.quantidade,
          quantidadeDisponivel: itens.quantidadeDisponivel,
        })
        .from(kitItens)
        .innerJoin(itens, eq(kitItens.itemId, itens.id))
        .where(eq(kitItens.kitId, input.kitId));

      const itensFaltando: string[] = [];

      for (const item of composicao) {
        if (item.quantidadeDisponivel < item.quantidadeNecessaria) {
          itensFaltando.push(item.nomeItem);
        }
      }

      return {
        disponivel: itensFaltando.length === 0,
        itensFaltando,
      };
    }),

  getDisponibilidadePorData: protectedProcedure
    .input(z.object({ data: z.coerce.date() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const todosKits = await db.select().from(kits);
      const todosItens = await db.select().from(itens);
      const reservado = await getReservadoPorItemNaData(db, input.data);

      const diaAnterior = new Date(input.data);
      diaAnterior.setDate(diaAnterior.getDate() - 1);
      const reservadoDiaAnterior = await getReservadoPorItemNaData(db, diaAnterior);

      const disponibilidadeItem = new Map(
        todosItens.map((i) => [i.id, i.quantidadeTotal - (reservado.get(i.id) || 0)])
      );
      const disponibilidadeItemDiaAnterior = new Map(
        todosItens.map((i) => [i.id, i.quantidadeTotal - (reservadoDiaAnterior.get(i.id) || 0)])
      );
      const reservadoDiaAnteriorMap = reservadoDiaAnterior;

      const resultado = [];
      for (const kit of todosKits) {
        const composicao = await db.select().from(kitItens).where(eq(kitItens.kitId, kit.id));
        if (composicao.length === 0) {
          resultado.push({ id: kit.id, nome: kit.nome, disponivel: 0, avisoRecolherDiaAnterior: null });
          continue;
        }
        let minDisponivel = Infinity;
        let minDisponivelComColetaDiaAnterior = Infinity;
        let precisaRecolherDiaAnterior = false;
        for (const ki of composicao) {
          const dispItem = disponibilidadeItem.get(ki.itemId) ?? 0;
          const dispItemComColeta = dispItem + (reservadoDiaAnteriorMap.get(ki.itemId) || 0);
          minDisponivel = Math.min(minDisponivel, Math.floor(dispItem / ki.quantidade));
          minDisponivelComColetaDiaAnterior = Math.min(minDisponivelComColetaDiaAnterior, Math.floor(dispItemComColeta / ki.quantidade));
          if (dispItem <= 0 && (reservadoDiaAnteriorMap.get(ki.itemId) || 0) > 0) {
            precisaRecolherDiaAnterior = true;
          }
        }
        const dispFinal = Math.max(0, minDisponivel);
        const dispComColeta = Math.max(0, minDisponivelComColetaDiaAnterior);
        resultado.push({
          id: kit.id,
          nome: kit.nome,
          disponivel: dispFinal,
          avisoRecolherDiaAnterior: dispFinal <= 0 && precisaRecolherDiaAnterior ? dispComColeta : null,
        });
      }
      return resultado;
    }),
});
