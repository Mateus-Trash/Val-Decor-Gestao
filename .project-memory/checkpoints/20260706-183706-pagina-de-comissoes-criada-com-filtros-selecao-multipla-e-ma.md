# Project Checkpoint: pagina-de-comissoes-criada-com-filtros-selecao-multipla-e-ma

| Field | Value |
|---|---|
| Timestamp | 2026-07-06 18:37:06 +0000 |
| Repository Root | `/home/ubuntu/val-decor-gestao` |
| Branch | `main` |
| Commit | `b198989` |
| Remote | `https://github.com/Mateus-Trash/Val-Decor-Gestao.git` |
| GitHub Remote Detected | yes |
| Working Tree | clean |

## Summary

Página de Comissões criada com filtros, seleção múltipla e marcar como paga/pendente. Campos pago e dataPagamento adicionados à tabela comissoes. comissoesRouter registrado. Postergar coleta implementado na Logística com campo coletaAdiadaPara. Endereço de entrega refatorado para 3 campos (ruaEntrega, bairroEntrega, numeroEntrega). Enum de status de pedidos reestruturado para [Pendente, Confirmado, EntregueNaoPago, EntreguePago, Concluido]. Página Estoque criada separada de Itens. Sistema de estoque corrigido para reservar apenas no dia exato de dataEntrega.

## Active Objective

Continue the active project task.

## Changed Files

No changed files reported by git status.

## Decisions

- Status de pedidos usa valores sem espaço (EntregueNaoPago, EntreguePago) para compatibilidade com MySQL enum e TypeScript. Estoque reserva apenas no dia exato de dataEntrega, não indefinidamente no futuro. dataColeta foi removida — coleta é sempre dataEntrega+1 dia (ou coletaAdiadaPara se preenchido). Endereço dividido em 3 campos estruturados para facilitar agrupamento por bairro na Logística.

## Discoveries

Not recorded.

## Bugs and Fixes

- Corrigida reserva de estoque que bloqueava agenda inteira para o futuro (lte -> eq na query de estoqueUtils). Corrigido onSuccess em useQuery substituído por useEffect no Logistica.tsx.

## Risks and Secret-Scan Warnings

No risks recorded.

## Next Actions

- Implementar permissões de acesso por role para colaboradores. Adicionar card de comissões pendentes no Dashboard. Criar relatório exportável em CSV.

## Resume Notes

Read `.project-memory/current-context.md`, then this checkpoint, then inspect `git status --short`. Continue with the first actionable item in **Next Actions** unless the user gives newer instructions.
