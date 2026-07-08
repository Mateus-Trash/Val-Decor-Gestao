import { eq, inArray, ne, sql, and } from "drizzle-orm";
import { itens, itensPedido, kitsPedido, kitItens, pedidos } from "../drizzle/schema";
/**
 * Retorna um Map<itemId, quantidadeReservada> somando reservas diretas (itensPedido)
 * e via kits (kitsPedido expandido por kitItens) de todos os pedidos cujo:
 * - status é DIFERENTE de "Concluido"
 * - dataEntrega é igual à data informada (DATE(dataEntrega) = DATE(data))
 *
 * Ou seja, o item fica reservado apenas no dia exato de entrega.
 * Em qualquer outro dia (passado ou futuro), o item está disponível normalmente.
 * Se o pedido for marcado como Concluido no mesmo dia, o item é liberado na hora.
 */
export async function getReservadoPorItemNaData(db: any, data: Date): Promise<Map<number, number>> {
  const pedidosReservados = await db
    .select({ id: pedidos.id })
    .from(pedidos)
    .where(
      and(
        ne(pedidos.status, "Concluido"),
        eq(sql`DATE(${pedidos.dataEntrega})`, sql`DATE(${data})`)
      )
    );

  const reservado = new Map<number, number>();
  const pedidoIds = pedidosReservados.map((p: { id: number }) => p.id);
  if (pedidoIds.length === 0) return reservado;

  const itensDiretos = await db
    .select({ itemId: itensPedido.itemId, quantidade: itensPedido.quantidade })
    .from(itensPedido)
    .where(inArray(itensPedido.pedidoId, pedidoIds));
  for (const i of itensDiretos) {
    reservado.set(i.itemId, (reservado.get(i.itemId) || 0) + i.quantidade);
  }

  const kitsDosPedidos = await db
    .select({ kitId: kitsPedido.kitId, quantidade: kitsPedido.quantidade })
    .from(kitsPedido)
    .where(inArray(kitsPedido.pedidoId, pedidoIds));
  for (const k of kitsDosPedidos) {
    const composicao = await db.select().from(kitItens).where(eq(kitItens.kitId, k.kitId));
    for (const ki of composicao) {
      const qtd = k.quantidade * ki.quantidade;
      reservado.set(ki.itemId, (reservado.get(ki.itemId) || 0) + qtd);
    }
  }

  return reservado;
}

const DIAS_LIMITE_ALERTA_COLETA = 3;

export interface AlertaColeta {
  pedidoId: number;
  nomeCliente: string;
  dataEntrega: Date;
  diasAtraso: number;
  itensAfetados: {
    itemId: number;
    nome: string;
    quantidade: number;
    disponivelHoje: number;
    disponivelSeNaoDevolver: number;
  }[];
}

export async function getAlertasColetaAtrasada(db: any): Promise<AlertaColeta[]> {
  const hoje = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_LIMITE_ALERTA_COLETA);

  const pedidosAtrasados = await db
    .select({
      id: pedidos.id,
      nomeCliente: pedidos.nomeCliente,
      dataEntrega: pedidos.dataEntrega,
    })
    .from(pedidos)
    .where(
      and(
        inArray(pedidos.status, ["EntregueNaoPago", "EntreguePago"]),
        sql`DATE(${pedidos.dataEntrega}) <= DATE(${limite})`
      )
    );

  if (pedidosAtrasados.length === 0) return [];

  const disponibilidadeHoje = await getReservadoPorItemNaData(db, hoje);
  const todosItens = await db.select().from(itens);
  const itensMap = new Map<number, any>(todosItens.map((i: any) => [i.id as number, i]));

  const alertas: AlertaColeta[] = [];

  for (const pedido of pedidosAtrasados) {
    const diasAtraso = Math.floor((hoje.getTime() - new Date(pedido.dataEntrega).getTime()) / 86400000);

    const itensDiretos = await db
      .select({ itemId: itensPedido.itemId, quantidade: itensPedido.quantidade })
      .from(itensPedido)
      .where(eq(itensPedido.pedidoId, pedido.id));

    const kitsDoP = await db
      .select({ kitId: kitsPedido.kitId, quantidade: kitsPedido.quantidade })
      .from(kitsPedido)
      .where(eq(kitsPedido.pedidoId, pedido.id));

    const quantidadePorItem = new Map<number, number>();
    for (const i of itensDiretos) {
      quantidadePorItem.set(i.itemId, (quantidadePorItem.get(i.itemId) || 0) + i.quantidade);
    }
    for (const k of kitsDoP) {
      const composicao = await db.select().from(kitItens).where(eq(kitItens.kitId, k.kitId));
      for (const ki of composicao) {
        const qtd = k.quantidade * ki.quantidade;
        quantidadePorItem.set(ki.itemId, (quantidadePorItem.get(ki.itemId) || 0) + qtd);
      }
    }

    const itensAfetados = Array.from(quantidadePorItem.entries()).map(([itemId, quantidade]) => {
      const item = itensMap.get(itemId);
      const disponivelHoje = item ? item.quantidadeTotal - (disponibilidadeHoje.get(itemId) || 0) : 0;
      return {
        itemId,
        nome: item?.nome ?? "Item removido",
        quantidade,
        disponivelHoje,
        disponivelSeNaoDevolver: disponivelHoje - quantidade,
      };
    });

    alertas.push({
      pedidoId: pedido.id,
      nomeCliente: pedido.nomeCliente,
      dataEntrega: pedido.dataEntrega,
      diasAtraso,
      itensAfetados,
    });
  }

  return alertas;
}
