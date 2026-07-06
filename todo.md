# DW Aluguéis Gestão — TODO

## Base de Dados & Schema
- [x] Tabela `users` (auth do Manus)
- [x] Tabela `clientes` com campos: id, nome, contato, email, observacoesInternas, createdAt, updatedAt
- [x] Tabela `colaboradores` com campos: id, nome, email (unique), telefone, funcao, percentualComissao (default 10), createdAt, updatedAt
- [x] Tabela `itens` com campos: id, nome, descricao, valorAluguel (centavos), custoAquisicao (centavos, nullable), quantidadeTotal, quantidadeDisponivel, createdAt, updatedAt
- [x] Tabela `kits` com campos: id, nome, descricao, valorAluguel (centavos), createdAt, updatedAt
- [x] Tabela `kitItens` com campos: id, kitId (fk), itemId (fk), quantidade
- [x] Tabela `pedidos` com campos: id, clienteId (fk, nullable), colaboradorId (fk), dataEvento, dataEntrega, dataColeta, enderecoEntrega, valorTotal (centavos), valorTaxaEntrega (float), status (enum), observacoes, createdAt, updatedAt
- [x] Tabela `itensPedido` com campos: id, pedidoId (fk), itemId (fk), quantidade, valorUnitario (centavos), createdAt, updatedAt
- [x] Tabela `kitsPedido` com campos: id, pedidoId (fk), kitId (fk), quantidade (default 1), valorUnitario (centavos)
- [x] Tabela `transacoesFinanceiras` com campos: id, pedidoId (fk, nullable), tipo (enum), descricao, valor (centavos), data, createdAt, updatedAt
- [x] Tabela `comissoes` com campos: id, colaboradorId (fk), pedidoId (fk), valor (centavos), dataCalculo, createdAt, updatedAt
- [x] Tabela `entregasColetas` com campos: id, pedidoId (fk), colaboradorId (fk, nullable), tipo (enum), dataAgendada, dataRealizada (nullable), status (enum), observacoes, createdAt, updatedAt
- [x] Arquivo `drizzle/relations.ts` com todas as relações
- [x] Arquivo `shared/types.ts` com re-exportação de tipos
- [x] Aplicar migrations ao banco de dados via `pnpm db:push`
- [x] Preparar `server/routers.ts` com imports comentados

## Routers de Negócio
- [x] Router `clientes` (list, create, update, delete, getById)
- [x] Router `colaboradores` (list, create, update, delete, getById)
- [x] Router `itens` (list, create, update, delete, getById)
- [x] Router `kits` (list, create, update, delete, getById, addItem, removeItem)
- [x] Router `pedidos` (list, create, update, delete, getById, changeStatus, listByCliente, listByColaborador)
- [x] Router `transacoesFinanceiras` (list, create, getById, listByPedido, listByTipo)
- [x] Router `comissoes` (list, getById, listByColaborador, listByPedido, calculate, delete)
- [x] Router `entregasColetas` (list, create, update, delete, getById, changeStatus, listByPedido, listByColaborador, listByStatus)

## Frontend - Páginas Principais
- [x] Layout dashboard com sidebar
- [x] Página de clientes com CRUD
- [x] Página de colaboradores com CRUD
- [x] Página de catálogo (itens)
- [x] Página de kits com CRUD e composição
- [x] Página de pedidos com CRUD, filtros, status inline e composição de itens/kits
- [x] Página de entregas/coletas (Logistica.tsx)
- [x] Página de financeiro (Financeiro.tsx)
- [x] Página de comissões (integrada em Colaboradores.tsx)
- [x] Página de calendário (Calendario.tsx)

## Testes
- [x] Testes unitários para routers de clientes
- [x] Testes unitários para routers de colaboradores
- [x] Testes unitários para routers de itens
- [x] Testes unitários para routers de kits
- [x] Testes unitários para routers de pedidos
- [x] Testes unitários para routers de auth
- [x] Testes unitários para routers de transações financeiras
- [x] Testes unitários para routers de comissões
- [x] Testes unitários para routers de entregas/coletas

## Controle de Estoque Automático (v1)
- [x] pedidosRouter.create: verificar estoque antes de inserir, subtrair após inserir (itens + kits)
- [x] pedidosRouter.delete: devolver estoque de itens e kits
- [x] pedidosRouter.updateStatus: nenhuma ação de estoque para mudanças de status (preparado para futuro Cancelado)
- [x] itensRouter.delete: bloquear se item em pedidos ativos
- [x] Itens.tsx: tooltip "Nenhuma unidade disponível para novos pedidos" no badge Sem Estoque
- [x] Pedidos.tsx: mostrar disponibilidade no dialog, bloquear se estoque insuficiente

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
- [x] pedidosRouter: validação de estoque por data (sem dedução global)
- [x] Calendario.tsx: grid mobile com chips coloridos + dialog de pedidos
- [x] NovoPedidoDialog.tsx: componente autocontido para criar pedidos
- [x] Calendario.tsx: integração de NovoPedidoDialog com data pré-preenchida

## Checkpoint Atual
- Version: f32b13a3
- Status: Todas as features principais implementadas
- Testes: 17 passando, 5 falhando (pré-existentes)
- TypeScript: Sem erros
