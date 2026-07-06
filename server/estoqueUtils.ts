import { eq, inArray, sql } from "drizzle-orm";
import { itensPedido, kitsPedido, kitItens, pedidos } from "../drizzle/schema";

/**
 * Retorna um Map<itemId, quantidadeReservada> somando reservas diretas (itensPedido)
 * e via kits (kitsPedido expandido por kitItens) de todos os pedidos cuja dataEvento
 * cai no mesmo dia (ignorando hora) da data informada.
 */
export async function getReservadoPorItemNaData(db: any, data: Date): Promise<Map<number, number>> {
  const pedidosNoDia = await db
    .select({ id: pedidos.id })
    .from(pedidos)
    .where(sql`DATE(${pedidos.dataEvento}) = DATE(${data})`);

  const reservado = new Map<number, number>();
  const pedidoIds = pedidosNoDia.map((p: { id: number }) => p.id);
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
