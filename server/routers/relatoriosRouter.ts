import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import {
  colaboradores,
  itens,
  itensPedido,
  kits,
  kitsPedido,
  pedidos,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

type PrecoBreakdown = { valorUnitario: number; quantidade: number; numeroPedidos: number };
type BairroBreakdown = { bairro: string; quantidade: number };
type ClienteBreakdown = { nomeCliente: string; quantidade: number };

type RankingEntry = {
  id: number;
  nome: string;
  categoria: string;
  quantidadeTotal: number;
  numeroPedidos: number;
  valorTotalArrecadado: number;
  valorMedioUnitario: number;
  valorAtualCadastro: number;
  precos: PrecoBreakdown[];
  bairros: BairroBreakdown[];
  clientes: ClienteBreakdown[];
};

type PedidoInfo = {
  id: number;
  nomeCliente: string;
  bairroEntrega: string;
  colaboradorId: number;
  colaboradorNome: string;
  valorTotal: number;
};

// Agrupa linhas de itensPedido OU kitsPedido (já vêm no mesmo formato) em um
// ranking por item/kit, cruzando com dados do pedido (bairro, cliente) via pedidoInfoMap.
// IMPORTANTE: itensPedido e kitsPedido são tabelas independentes — um kit alugado
// nunca gera linhas em itensPedido para seus componentes, então não há risco de
// contar um item duas vezes (uma vez avulso, outra dentro do kit).
function construirRanking(
  linhas: {
    pedidoId: number;
    entidadeId: number;
    nome: string;
    categoria: string;
    quantidade: number;
    valorUnitario: number;
    valorPadrao: number;
  }[],
  pedidoInfoMap: Map<number, PedidoInfo>
): RankingEntry[] {
  type Acumulador = {
    id: number;
    nome: string;
    categoria: string;
    quantidadeTotal: number;
    valorTotalArrecadado: number;
    valorPadrao: number;
    pedidosSet: Set<number>;
    precosMap: Map<number, { quantidade: number; pedidosSet: Set<number> }>;
    bairrosMap: Map<string, number>;
    clientesMap: Map<string, number>;
  };

  const acumuladores = new Map<number, Acumulador>();

  for (const linha of linhas) {
    const info = pedidoInfoMap.get(linha.pedidoId);
    if (!info) continue;

    let acc = acumuladores.get(linha.entidadeId);
    if (!acc) {
      acc = {
        id: linha.entidadeId,
        nome: linha.nome,
        categoria: linha.categoria,
        quantidadeTotal: 0,
        valorTotalArrecadado: 0,
        valorPadrao: linha.valorPadrao,
        pedidosSet: new Set(),
        precosMap: new Map(),
        bairrosMap: new Map(),
        clientesMap: new Map(),
      };
      acumuladores.set(linha.entidadeId, acc);
    }

    acc.quantidadeTotal += linha.quantidade;
    acc.valorTotalArrecadado += linha.quantidade * linha.valorUnitario;
    acc.pedidosSet.add(linha.pedidoId);

    const precoAtual = acc.precosMap.get(linha.valorUnitario) ?? { quantidade: 0, pedidosSet: new Set<number>() };
    precoAtual.quantidade += linha.quantidade;
    precoAtual.pedidosSet.add(linha.pedidoId);
    acc.precosMap.set(linha.valorUnitario, precoAtual);

    acc.bairrosMap.set(info.bairroEntrega, (acc.bairrosMap.get(info.bairroEntrega) ?? 0) + linha.quantidade);
    acc.clientesMap.set(info.nomeCliente, (acc.clientesMap.get(info.nomeCliente) ?? 0) + linha.quantidade);
  }

  return [...acumuladores.values()]
    .map((acc) => ({
      id: acc.id,
      nome: acc.nome,
      categoria: acc.categoria,
      quantidadeTotal: acc.quantidadeTotal,
      numeroPedidos: acc.pedidosSet.size,
      valorTotalArrecadado: acc.valorTotalArrecadado,
      valorMedioUnitario: acc.quantidadeTotal > 0 ? Math.round(acc.valorTotalArrecadado / acc.quantidadeTotal) : 0,
      valorAtualCadastro: acc.valorPadrao,
      precos: [...acc.precosMap.entries()]
        .map(([valorUnitario, v]) => ({ valorUnitario, quantidade: v.quantidade, numeroPedidos: v.pedidosSet.size }))
        .sort((a, b) => b.quantidade - a.quantidade),
      bairros: [...acc.bairrosMap.entries()]
        .map(([bairro, quantidade]) => ({ bairro, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade),
      clientes: [...acc.clientesMap.entries()]
        .map(([nomeCliente, quantidade]) => ({ nomeCliente, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade),
    }))
    .sort((a, b) => b.quantidadeTotal - a.quantidadeTotal);
}

const relatorioVazio = {
  resumoGeral: {
    totalPedidos: 0,
    faturamentoTotal: 0,
    ticketMedio: 0,
    totalItensAvulsosQuantidade: 0,
    totalKitsQuantidade: 0,
    totalBairrosDistintos: 0,
    totalClientesDistintos: 0,
  },
  rankingKits: [] as RankingEntry[],
  rankingItens: [] as RankingEntry[],
  rankingBairros: [] as { bairro: string; totalPedidos: number; valorTotal: number }[],
  rankingClientes: [] as { nomeCliente: string; totalPedidos: number; valorTotal: number }[],
  rankingColaboradores: [] as { colaboradorId: number; nome: string; totalPedidos: number; valorTotal: number }[],
};

export const relatoriosRouter = router({
  getRelatorioPeriodo: protectedProcedure
    .input(
      z.object({
        dataInicio: z.coerce.date(),
        dataFim: z.coerce.date(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return relatorioVazio;

      const pedidosPeriodo = await db
        .select({
          id: pedidos.id,
          nomeCliente: pedidos.nomeCliente,
          bairroEntrega: pedidos.bairroEntrega,
          colaboradorId: pedidos.colaboradorId,
          colaboradorNome: colaboradores.nome,
          valorTotal: pedidos.valorTotal,
        })
        .from(pedidos)
        .innerJoin(colaboradores, eq(pedidos.colaboradorId, colaboradores.id))
        .where(and(gte(pedidos.data, input.dataInicio), lte(pedidos.data, input.dataFim)));

      if (pedidosPeriodo.length === 0) return relatorioVazio;

      const pedidoInfoMap = new Map<number, PedidoInfo>(pedidosPeriodo.map((p) => [p.id, p]));
      const pedidoIds = pedidosPeriodo.map((p) => p.id);

      const [itensRows, kitsRows] = await Promise.all([
        db
          .select({
            pedidoId: itensPedido.pedidoId,
            entidadeId: itensPedido.itemId,
            nome: itens.nome,
            categoria: itens.categoria,
            quantidade: itensPedido.quantidade,
            valorUnitario: itensPedido.valorUnitario,
            valorPadrao: itens.valorAluguel,
          })
          .from(itensPedido)
          .innerJoin(itens, eq(itensPedido.itemId, itens.id))
          .where(inArray(itensPedido.pedidoId, pedidoIds)),
        db
          .select({
            pedidoId: kitsPedido.pedidoId,
            entidadeId: kitsPedido.kitId,
            nome: kits.nome,
            categoria: kits.categoria,
            quantidade: kitsPedido.quantidade,
            valorUnitario: kitsPedido.valorUnitario,
            valorPadrao: kits.valorAluguel,
          })
          .from(kitsPedido)
          .innerJoin(kits, eq(kitsPedido.kitId, kits.id))
          .where(inArray(kitsPedido.pedidoId, pedidoIds)),
      ]);

      const rankingKits = construirRanking(kitsRows, pedidoInfoMap);
      const rankingItens = construirRanking(itensRows, pedidoInfoMap);

      // Ranking de bairros e clientes é calculado sobre os PEDIDOS (não sobre
      // as linhas de item/kit), pra não inflar a contagem quando um pedido tem
      // vários itens/kits diferentes.
      const bairrosMap = new Map<string, { totalPedidos: number; valorTotal: number }>();
      const clientesMap = new Map<string, { totalPedidos: number; valorTotal: number }>();
      const colaboradoresMap = new Map<number, { nome: string; totalPedidos: number; valorTotal: number }>();

      for (const p of pedidosPeriodo) {
        const bairroAtual = bairrosMap.get(p.bairroEntrega) ?? { totalPedidos: 0, valorTotal: 0 };
        bairroAtual.totalPedidos += 1;
        bairroAtual.valorTotal += p.valorTotal;
        bairrosMap.set(p.bairroEntrega, bairroAtual);

        const clienteAtual = clientesMap.get(p.nomeCliente) ?? { totalPedidos: 0, valorTotal: 0 };
        clienteAtual.totalPedidos += 1;
        clienteAtual.valorTotal += p.valorTotal;
        clientesMap.set(p.nomeCliente, clienteAtual);

        const colaboradorAtual = colaboradoresMap.get(p.colaboradorId) ?? {
          nome: p.colaboradorNome,
          totalPedidos: 0,
          valorTotal: 0,
        };
        colaboradorAtual.totalPedidos += 1;
        colaboradorAtual.valorTotal += p.valorTotal;
        colaboradoresMap.set(p.colaboradorId, colaboradorAtual);
      }

      const rankingBairros = [...bairrosMap.entries()]
        .map(([bairro, v]) => ({ bairro, ...v }))
        .sort((a, b) => b.totalPedidos - a.totalPedidos);

      const rankingClientes = [...clientesMap.entries()]
        .map(([nomeCliente, v]) => ({ nomeCliente, ...v }))
        .sort((a, b) => b.totalPedidos - a.totalPedidos);

      const rankingColaboradores = [...colaboradoresMap.entries()]
        .map(([colaboradorId, v]) => ({ colaboradorId, ...v }))
        .sort((a, b) => b.totalPedidos - a.totalPedidos);

      const totalPedidos = pedidosPeriodo.length;
      const faturamentoTotal = pedidosPeriodo.reduce((acc, p) => acc + p.valorTotal, 0);
      const ticketMedio = totalPedidos > 0 ? Math.round(faturamentoTotal / totalPedidos) : 0;
      const totalItensAvulsosQuantidade = itensRows.reduce((acc, r) => acc + r.quantidade, 0);
      const totalKitsQuantidade = kitsRows.reduce((acc, r) => acc + r.quantidade, 0);

      return {
        resumoGeral: {
          totalPedidos,
          faturamentoTotal,
          ticketMedio,
          totalItensAvulsosQuantidade,
          totalKitsQuantidade,
          totalBairrosDistintos: bairrosMap.size,
          totalClientesDistintos: clientesMap.size,
        },
        rankingKits,
        rankingItens,
        rankingBairros,
        rankingClientes,
        rankingColaboradores,
      };
    }),
});
