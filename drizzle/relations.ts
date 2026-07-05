import { relations } from "drizzle-orm";
import {
  clientes,
  colaboradores,
  comissoes,
  entregasColetas,
  itens,
  itensPedido,
  kits,
  kitItens,
  kitsPedido,
  pedidos,
  transacoesFinanceiras,
} from "./schema";

/**
 * Relações para a tabela clientes
 */
export const clientesRelations = relations(clientes, ({ many }) => ({
  pedidos: many(pedidos),
}));

/**
 * Relações para a tabela colaboradores
 */
export const colaboradoresRelations = relations(colaboradores, ({ many }) => ({
  pedidos: many(pedidos),
  comissoes: many(comissoes),
  entregasColetas: many(entregasColetas),
}));

/**
 * Relações para a tabela itens
 */
export const itensRelations = relations(itens, ({ many }) => ({
  kitItens: many(kitItens),
  itensPedido: many(itensPedido),
}));

/**
 * Relações para a tabela kits
 */
export const kitsRelations = relations(kits, ({ many }) => ({
  kitItens: many(kitItens),
  kitsPedido: many(kitsPedido),
}));

/**
 * Relações para a tabela kitItens
 */
export const kitItensRelations = relations(kitItens, ({ one }) => ({
  kit: one(kits, {
    fields: [kitItens.kitId],
    references: [kits.id],
  }),
  item: one(itens, {
    fields: [kitItens.itemId],
    references: [itens.id],
  }),
}));

/**
 * Relações para a tabela pedidos
 */
export const pedidosRelations = relations(pedidos, ({ one, many }) => ({
  cliente: one(clientes, {
    fields: [pedidos.clienteId],
    references: [clientes.id],
  }),
  colaborador: one(colaboradores, {
    fields: [pedidos.colaboradorId],
    references: [colaboradores.id],
  }),
  itensPedido: many(itensPedido),
  kitsPedido: many(kitsPedido),
  transacoesFinanceiras: many(transacoesFinanceiras),
  comissoes: many(comissoes),
  entregasColetas: many(entregasColetas),
}));

/**
 * Relações para a tabela itensPedido
 */
export const itensPedidoRelations = relations(itensPedido, ({ one }) => ({
  pedido: one(pedidos, {
    fields: [itensPedido.pedidoId],
    references: [pedidos.id],
  }),
  item: one(itens, {
    fields: [itensPedido.itemId],
    references: [itens.id],
  }),
}));

/**
 * Relações para a tabela kitsPedido
 */
export const kitsPedidoRelations = relations(kitsPedido, ({ one }) => ({
  pedido: one(pedidos, {
    fields: [kitsPedido.pedidoId],
    references: [pedidos.id],
  }),
  kit: one(kits, {
    fields: [kitsPedido.kitId],
    references: [kits.id],
  }),
}));

/**
 * Relações para a tabela transacoesFinanceiras
 */
export const transacoesFinanceirasRelations = relations(transacoesFinanceiras, ({ one }) => ({
  pedido: one(pedidos, {
    fields: [transacoesFinanceiras.pedidoId],
    references: [pedidos.id],
  }),
}));

/**
 * Relações para a tabela comissoes
 */
export const comissoesRelations = relations(comissoes, ({ one }) => ({
  colaborador: one(colaboradores, {
    fields: [comissoes.colaboradorId],
    references: [colaboradores.id],
  }),
  pedido: one(pedidos, {
    fields: [comissoes.pedidoId],
    references: [pedidos.id],
  }),
}));

/**
 * Relações para a tabela entregasColetas
 */
export const entregasColetasRelations = relations(entregasColetas, ({ one }) => ({
  pedido: one(pedidos, {
    fields: [entregasColetas.pedidoId],
    references: [pedidos.id],
  }),
  colaborador: one(colaboradores, {
    fields: [entregasColetas.colaboradorId],
    references: [colaboradores.id],
  }),
}));
