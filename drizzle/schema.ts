import { float, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;



/**
 * Colaboradores — Equipe de trabalho com comissões
 * percentualComissao: inteiro representando 0-100% (ex: 10 = 10%)
 */
export const colaboradores = mysqlTable("colaboradores", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  telefone: varchar("telefone", { length: 20 }),
  funcao: varchar("funcao", { length: 100 }),
  percentualComissao: int("percentualComissao").default(10).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Colaborador = typeof colaboradores.$inferSelect;
export type InsertColaborador = typeof colaboradores.$inferInsert;

/**
 * Itens — Catálogo de itens individuais para aluguel
 * Valores monetários em centavos (int)
 */
export const itens = mysqlTable("itens", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  valorAluguel: int("valorAluguel").notNull(), // em centavos
  custoAquisicao: int("custoAquisicao"), // em centavos, nullable
  quantidadeTotal: int("quantidadeTotal").notNull(),
  quantidadeDisponivel: int("quantidadeDisponivel").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Item = typeof itens.$inferSelect;
export type InsertItem = typeof itens.$inferInsert;

/**
 * Kits — Pacotes pré-configurados de itens para aluguel
 * Valores monetários em centavos (int)
 */
export const kits = mysqlTable("kits", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  valorAluguel: int("valorAluguel").notNull(), // em centavos
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Kit = typeof kits.$inferSelect;
export type InsertKit = typeof kits.$inferInsert;

/**
 * KitItens — Composição de itens dentro de um kit
 */
export const kitItens = mysqlTable("kitItens", {
  id: int("id").autoincrement().primaryKey(),
  kitId: int("kitId").notNull(),
  itemId: int("itemId").notNull(),
  quantidade: int("quantidade").notNull(),
});

export type KitItem = typeof kitItens.$inferSelect;
export type InsertKitItem = typeof kitItens.$inferInsert;

/**
 * Pedidos — Registros de pedidos de aluguel
 * Valores monetários em centavos (int), exceto valorTaxaEntrega que é float em reais
 */
export const pedidos = mysqlTable("pedidos", {
  id: int("id").autoincrement().primaryKey(),
  nomeCliente: varchar("nomeCliente", { length: 255 }).notNull(),
  colaboradorId: int("colaboradorId").notNull(),
  dataEvento: timestamp("dataEvento").notNull(),
  dataEntrega: timestamp("dataEntrega").notNull(),
  ruaEntrega: varchar("ruaEntrega", { length: 255 }).notNull(),
  bairroEntrega: varchar("bairroEntrega", { length: 120 }).notNull(),
  numeroEntrega: varchar("numeroEntrega", { length: 20 }).notNull(),
  valorTotal: int("valorTotal").notNull(), // em centavos
  valorTaxaEntrega: float("valorTaxaEntrega").default(0).notNull(), // em reais
  status: mysqlEnum("status", ["Pendente", "Confirmado", "EntregueNaoPago", "EntreguePago", "Concluido"]).default("Pendente").notNull(),
  observacoes: text("observacoes"),
  coletaAdiadaPara: timestamp("coletaAdiadaPara"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pedido = typeof pedidos.$inferSelect;
export type InsertPedido = typeof pedidos.$inferInsert;

/**
 * ItensPedido — Itens individuais vinculados a um pedido
 * Valores monetários em centavos (int)
 */
export const itensPedido = mysqlTable("itensPedido", {
  id: int("id").autoincrement().primaryKey(),
  pedidoId: int("pedidoId").notNull(),
  itemId: int("itemId").notNull(),
  quantidade: int("quantidade").notNull(),
  valorUnitario: int("valorUnitario").notNull(), // em centavos
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ItemPedido = typeof itensPedido.$inferSelect;
export type InsertItemPedido = typeof itensPedido.$inferInsert;

/**
 * KitsPedido — Kits vinculados a um pedido
 * Valores monetários em centavos (int)
 */
export const kitsPedido = mysqlTable("kitsPedido", {
  id: int("id").autoincrement().primaryKey(),
  pedidoId: int("pedidoId").notNull(),
  kitId: int("kitId").notNull(),
  quantidade: int("quantidade").default(1).notNull(),
  valorUnitario: int("valorUnitario").notNull(), // em centavos
});

export type KitPedido = typeof kitsPedido.$inferSelect;
export type InsertKitPedido = typeof kitsPedido.$inferInsert;

/**
 * TransacoesFinanceiras — Registro de todas as transações financeiras
 * Valores monetários em centavos (int)
 */
export const transacoesFinanceiras = mysqlTable("transacoesFinanceiras", {
  id: int("id").autoincrement().primaryKey(),
  pedidoId: int("pedidoId"), // nullable
  tipo: mysqlEnum("tipo", ["receita", "despesa", "taxa_entrega"]).notNull(),
  descricao: text("descricao"),
  valor: int("valor").notNull(), // em centavos
  data: timestamp("data").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TransacaoFinanceira = typeof transacoesFinanceiras.$inferSelect;
export type InsertTransacaoFinanceira = typeof transacoesFinanceiras.$inferInsert;

/**
 * Comissoes — Registro de comissões de colaboradores por pedido
 * Valores monetários em centavos (int)
 */
export const comissoes = mysqlTable("comissoes", {
  id: int("id").autoincrement().primaryKey(),
  colaboradorId: int("colaboradorId").notNull(),
  pedidoId: int("pedidoId").notNull(),
  valor: int("valor").notNull(), // em centavos
  dataCalculo: timestamp("dataCalculo").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Comissao = typeof comissoes.$inferSelect;
export type InsertComissao = typeof comissoes.$inferInsert;

/**
 * EntregasColetas — Registro de entregas e coletas de pedidos
 */
export const entregasColetas = mysqlTable("entregasColetas", {
  id: int("id").autoincrement().primaryKey(),
  pedidoId: int("pedidoId").notNull(),
  colaboradorId: int("colaboradorId"), // nullable
  tipo: mysqlEnum("tipo", ["entrega", "coleta"]).notNull(),
  dataAgendada: timestamp("dataAgendada").notNull(),
  dataRealizada: timestamp("dataRealizada"), // nullable
  status: mysqlEnum("status", ["agendado", "em_rota", "concluido", "cancelado"]).default("agendado").notNull(),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EntregaColeta = typeof entregasColetas.$inferSelect;
export type InsertEntregaColeta = typeof entregasColetas.$inferInsert;
