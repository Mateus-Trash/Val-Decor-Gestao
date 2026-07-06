# Val Decor Gestão — TODO

## Base de Dados & Schema
- [x] Tabela `users` (auth do Manus)
- [x] Tabela `colaboradores` com campos: id, nome, email, telefone, funcao, percentualComissao, createdAt, updatedAt
- [x] Tabela `itens` com campos: id, nome, descricao, valorAluguel, custoAquisicao, quantidadeTotal, quantidadeDisponivel, createdAt, updatedAt
- [x] Tabela `kits` com campos: id, nome, descricao, valorAluguel, createdAt, updatedAt
- [x] Tabela `kitItens` com campos: id, kitId, itemId, quantidade
- [x] Tabela `pedidos` com campos: id, nomeCliente, colaboradorId, dataEvento, dataEntrega, dataColeta, enderecoEntrega, valorTotal, valorTaxaEntrega, status, observacoes, createdAt, updatedAt
- [x] Tabela `itensPedido` com campos: id, pedidoId, itemId, quantidade, valorUnitario, createdAt, updatedAt
- [x] Tabela `kitsPedido` com campos: id, pedidoId, kitId, quantidade, valorUnitario
- [x] Tabela `transacoesFinanceiras` com campos: id, pedidoId, tipo, descricao, valor, data, createdAt, updatedAt
- [x] Tabela `comissoes` com campos: id, colaboradorId, pedidoId, valor, dataCalculo, createdAt, updatedAt
- [x] Tabela `entregasColetas` com campos: id, pedidoId, colaboradorId, tipo, dataAgendada, dataRealizada, status, observacoes, createdAt, updatedAt
- [x] Arquivo `drizzle/relations.ts` com todas as relações
- [x] Arquivo `shared/types.ts` com re-exportação de tipos
- [x] Aplicar migrations ao banco de dados via SQL

## Routers de Negócio
- [x] Router `colaboradores` (list, create, update, delete, getById)
- [x] Router `itens` (list, create, update, delete, getById)
- [x] Router `kits` (list, create, update, delete, getById, addItem, removeItem)
- [x] Router `pedidos` (list, create, update, delete, getById, changeStatus)
- [x] Router `transacoesFinanceiras` (list, create, getById, listByPedido, listByTipo)
- [x] Router `comissoes` (list, getById, listByColaborador, listByPedido, calculate, delete)
- [x] Router `entregasColetas` (list, create, update, delete, getById, changeStatus, listByPedido, listByColaborador, listByStatus)
- [x] Router `financeiros` (agregação de dados financeiros)
- [x] Router `dashboard` (KPIs e estatísticas)

## Frontend - Páginas Principais
- [x] Layout dashboard com sidebar
- [x] Página de colaboradores com CRUD
- [x] Página de catálogo (itens)
- [x] Página de kits com CRUD e composição
- [x] Página de pedidos com CRUD, filtros, status inline e composição de itens/kits
- [x] Página de entregas/coletas (Logistica.tsx)
- [x] Página de financeiro (Financeiro.tsx)
- [x] Página de calendário (Calendario.tsx)
- [x] Página de dashboard (Dashboard.tsx)

## Responsividade Mobile
- [x] DashboardLayout.tsx: sidebar overlay em mobile
- [x] Calendario.tsx: grid 7 colunas com chips coloridos + dialog de pedidos do dia
- [x] Dashboard.tsx: cards KPI, status e gráficos responsivos
- [x] Pedidos.tsx: tabela → cards em mobile
- [x] Itens.tsx: tabela → cards em mobile
- [x] Kits.tsx: tabela → cards em mobile
- [x] Colaboradores.tsx: tabela → cards em mobile
- [x] Financeiro.tsx: tabela → cards em mobile
- [x] Logistica.tsx: tabela → cards em mobile

## Sistema de Estoque por Data (v2)
- [x] server/estoqueUtils.ts: getReservadoPorItemNaData()
- [x] itensRouter: endpoint getDisponibilidadePorData
- [x] kitsRouter: endpoint getDisponibilidadePorData
- [x] pedidosRouter: validação de estoque por data
- [x] Calendario.tsx: grid mobile com chips coloridos + dialog de pedidos
- [x] NovoPedidoDialog.tsx: componente autocontido para criar pedidos
- [x] Calendario.tsx: integração de NovoPedidoDialog com data pré-preenchida

## Checkpoint Atual - Restauração Completa
- [x] Todos os arquivos copiados do repositório original
- [x] Schema de banco de dados criado
- [x] Routers tRPC restaurados
- [x] Páginas frontend restauradas
- [x] Componentes restaurados
- [x] Contextos e hooks restaurados
- [x] Servidor iniciado sem erros
- [x] TypeScript sem erros de compilação
- [x] TypeScript sem erros de compilação

## Reestruturação do Enum de Status de Pedidos
- [x] drizzle/schema.ts: alterar enum status de pedidos para novo conjunto de valores
- [x] Migration Drizzle com UPDATE de dados existentes (Em Preparacao→Confirmado, Entregue→EntregueNaoPago)
- [x] server/routers/pedidosRouter.ts: atualizar z.enum statusEnum
- [x] client/src/pages/Pedidos.tsx: atualizar statusOptions, statusColors e labels
- [x] client/src/pages/Calendario.tsx: atualizar statusBadge e SelectContent
- [x] client/src/pages/Dashboard.tsx: atualizar STATUS_COLORS
- [x] pnpm check: sem referências a "Em Preparacao" ou "Entregue" (sem sufixo)
