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
        predefinicao: z.enum(["Conjuntos", "Pegue e Monte"]).optional(),
        tema: z.string().optional(),
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

      let itensComposicao = [...input.itens];

      // Se for predefinição "Pegue e Monte", garantir que os itens padrão existam
      if (input.predefinicao === "Pegue e Monte" && input.tema) {
        const todosItens = await db.select().from(itens);
        const nomePanos = `Panos ${input.tema}`;

        // Buscar ou criar Cilindro
        let cilindro = todosItens.find((i) => i.nome.toLowerCase().includes("cilindro"));
        if (!cilindro) {
          const res = await db.insert(itens).values({
            nome: "Cilindro",
            categoria: "Decoracoes",
            valorAluguel: 1500,
            quantidadeTotal: 1,
            quantidadeDisponivel: 1,
          });
          cilindro = { id: Number(res[0].insertId), nome: "Cilindro", valorAluguel: 1500, quantidadeTotal: 1, quantidadeDisponivel: 1 } as any;
        }

        // Buscar ou criar Painel de Ferro
        let painel = todosItens.find((i) => i.nome.toLowerCase().includes("painel") && i.nome.toLowerCase().includes("ferro"));
        if (!painel) {
          const res = await db.insert(itens).values({
            nome: "Painel de Ferro",
            categoria: "Decoracoes",
            valorAluguel: 2000,
            quantidadeTotal: 1,
            quantidadeDisponivel: 1,
          });
          painel = { id: Number(res[0].insertId), nome: "Painel de Ferro", valorAluguel: 2000, quantidadeTotal: 1, quantidadeDisponivel: 1 } as any;
        }

        // Buscar ou criar Panos [tema]
        let panos = todosItens.find((i) => i.nome.toLowerCase() === nomePanos.toLowerCase());
        if (!panos) {
          const res = await db.insert(itens).values({
            nome: nomePanos,
            categoria: "Decoracoes",
            valorAluguel: 1000,
            quantidadeTotal: 1,
            quantidadeDisponivel: 1,
          });
          panos = { id: Number(res[0].insertId), nome: nomePanos, valorAluguel: 1000, quantidadeTotal: 1, quantidadeDisponivel: 1 } as any;
        }

        // Adicionar à composição se ainda não estiver
        const idsAtuais = new Set(itensComposicao.map((i) => i.itemId));
        if (!idsAtuais.has(cilindro!.id)) itensComposicao.push({ itemId: cilindro!.id, quantidade: 3 });
        if (!idsAtuais.has(painel!.id)) itensComposicao.push({ itemId: painel!.id, quantidade: 1 });
        if (!idsAtuais.has(panos!.id)) itensComposicao.push({ itemId: panos!.id, quantidade: 1 });
      }

      if (itensComposicao.length > 0) {
        await db.insert(kitItens).values(
          itensComposicao.map((item) => ({
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
        predefinicao: z.enum(["Conjuntos", "Pegue e Monte"]).optional(),
        tema: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, itens: novosItens, predefinicao, tema, ...campos } = input;

      // Atualizar campos do kit se houver
      if (Object.keys(campos).length > 0) {
        await db.update(kits).set(campos).where(eq(kits.id, id));
      }

      // Se itens foram enviados: deletar todos e reinserir
      if (novosItens !== undefined) {
        let itensComposicao = [...novosItens];

        // Se for predefinição "Pegue e Monte", garantir que os itens padrão existam
        if (predefinicao === "Pegue e Monte" && tema) {
          const todosItens = await db.select().from(itens);
          const nomePanos = `Panos ${tema}`;

          let cilindro = todosItens.find((i) => i.nome.toLowerCase().includes("cilindro"));
          if (!cilindro) {
            const res = await db.insert(itens).values({ nome: "Cilindro", categoria: "Decoracoes", valorAluguel: 1500, quantidadeTotal: 1, quantidadeDisponivel: 1 });
            cilindro = { id: Number(res[0].insertId), nome: "Cilindro" } as any;
          }
          let painel = todosItens.find((i) => i.nome.toLowerCase().includes("painel") && i.nome.toLowerCase().includes("ferro"));
          if (!painel) {
            const res = await db.insert(itens).values({ nome: "Painel de Ferro", categoria: "Decoracoes", valorAluguel: 2000, quantidadeTotal: 1, quantidadeDisponivel: 1 });
            painel = { id: Number(res[0].insertId), nome: "Painel de Ferro" } as any;
          }
          let panos = todosItens.find((i) => i.nome.toLowerCase() === nomePanos.toLowerCase());
          if (!panos) {
            const res = await db.insert(itens).values({ nome: nomePanos, categoria: "Decoracoes", valorAluguel: 1000, quantidadeTotal: 1, quantidadeDisponivel: 1 });
            panos = { id: Number(res[0].insertId), nome: nomePanos } as any;
          }

          const idsAtuais = new Set(itensComposicao.map((i) => i.itemId));
          if (!idsAtuais.has(cilindro!.id)) itensComposicao.push({ itemId: cilindro!.id, quantidade: 3 });
          if (!idsAtuais.has(painel!.id)) itensComposicao.push({ itemId: painel!.id, quantidade: 1 });
          if (!idsAtuais.has(panos!.id)) itensComposicao.push({ itemId: panos!.id, quantidade: 1 });
        }

        await db.delete(kitItens).where(eq(kitItens.kitId, id));

        if (itensComposicao.length > 0) {
          await db.insert(kitItens).values(
            itensComposicao.map((item) => ({
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
