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
- [x] pnpm check: sem referências a "Em Preparacao" ou "Entregue" (sem sufixo)

## Refatoração do Sistema de Estoque (Reserva por Período)
- [x] drizzle/schema.ts: remover coluna dataColeta da tabela pedidos
- [x] Migration Drizzle para remover dataColeta
- [x] server/estoqueUtils.ts: reescrever para reservar por período (dataEntrega <= data E status != Concluido)
- [x] server/routers/pedidosRouter.ts: remover dataColeta do input/select, usar dataEntrega na verificação
- [x] client/src/components/NovoPedidoDialog.tsx: remover dataColeta, usar getDisponibilidadePorData
- [x] client/src/pages/Pedidos.tsx: remover dataColeta, usar getDisponibilidadePorData
- [x] Remover referências remanescentes a dataColeta em todo o projeto
- [x] pnpm check e pnpm test: corrigir testes quebrados

## Substituição de Auth: Manus OAuth → Login próprio email/senha
- [x] Instalar bcryptjs, jsonwebtoken e @types
- [x] Schema: remover openId/loginMethod de users, adicionar passwordHash, tornar email notNull unique
- [x] Schema: adicionar userId (int, nullable, unique) em colaboradores
- [x] Gerar e aplicar migration
- [x] Criar server/_core/authUtils.ts (hash, verify, signToken, verifyToken)
- [x] Atualizar server/_core/context.ts: remover sdk, usar verifyToken + buscar colaborador
- [x] Adicionar auth.login mutation em server/routers.ts
- [x] auth.me retornar colaboradorId vinculado
- [x] colaboradoresRouter.create: criar user + colaborador em transação
- [x] colaboradoresRouter.update: campo novaSenha opcional
- [x] Deletar server/_core/oauth.ts e sdk.ts, remover de index.ts
- [x] Criar server/scripts/createUser.ts (CLI admin)
- [x] Criar client/src/pages/Login.tsx
- [x] Atualizar App.tsx com rota /login
- [x] Atualizar client/src/const.ts: remover getLoginUrl
- [x] Atualizar useAuth.ts: redirect para /login
- [x] DashboardLayout.tsx: useAuth com redirectOnUnauthenticated
- [x] Colaboradores.tsx: campo senha no criar, novaSenha no editar
- [x] NovoPedidoDialog.tsx: pré-preencher colaboradorId se vinculado
- [x] pnpm check e pnpm test sem erros

## Responsividade Mobile — NovoPedidoDialog
- [x] Corrigir DialogContent: padding reduzido e largura total no mobile
- [x] Substituir tabelas de composição (itens/kits) por cards/listas responsivas no mobile
- [x] Ajustar rows de seleção de itens/kits (Select + Input + Button) para empilhamento vertical no mobile
- [x] pnpm check sem erros, checkpoint e push

## Melhorias de UX — Filtros e Compactação
- [x] Financeiro: linhas expansíveis com detalhes (toque para expandir)
- [x] Financeiro: filtros por colaborador, data e tipo (aluguel, despesa, taxa de entrega)
- [x] Pedidos: filtros por data, cliente, status, colaborador
- [x] Compactar cards mobile (Itens, Kits, Colaboradores, Comissoes) para ocupar menos espaço
- [x] pnpm check, testes, checkpoint e push

## 4 Tarefas Independentes — Espaço Cards, Login, Calendário, Logística
- [x] Tarefa 1: Corrigir gap-6 excessivo no EntityCard (adicionar gap-0) e varredura de outros Cards
- [x] Tarefa 2: Adicionar "Lembrar de mim" no Login (localStorage)
- [x] Tarefa 3: Composição do pedido no dialog do dia — Calendário.tsx (backend + frontend)
- [x] Tarefa 4: Composição do pedido na Logística — Logistica.tsx (backend + frontend)
- [x] pnpm type-check + pnpm test, checkpoint e push
