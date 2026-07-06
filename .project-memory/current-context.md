# Current Project Context

| Field | Value |
|---|---|
| Last Updated | 2026-07-06 18:37:06 +0000 |
| Repository Root | `/home/ubuntu/val-decor-gestao` |
| Branch | `main` |
| Commit | `b198989` |
| Remote | `https://github.com/Mateus-Trash/Val-Decor-Gestao.git` |
| GitHub Remote Detected | yes |
| Working Tree | clean |
| Latest Checkpoint | `.project-memory/checkpoints/20260706-183706-pagina-de-comissoes-criada-com-filtros-selecao-multipla-e-ma.md` |

## Active Objective

Continue the active project task.

## Current State

Página de Comissões criada com filtros, seleção múltipla e marcar como paga/pendente. Campos pago e dataPagamento adicionados à tabela comissoes. comissoesRouter registrado. Postergar coleta implementado na Logística com campo coletaAdiadaPara. Endereço de entrega refatorado para 3 campos (ruaEntrega, bairroEntrega, numeroEntrega). Enum de status de pedidos reestruturado para [Pendente, Confirmado, EntregueNaoPago, EntreguePago, Concluido]. Página Estoque criada separada de Itens. Sistema de estoque corrigido para reservar apenas no dia exato de dataEntrega.

## Important Files and Areas

No changed files reported by git status.

## Recent Progress

See `.project-memory/checkpoints/20260706-183706-pagina-de-comissoes-criada-com-filtros-selecao-multipla-e-ma.md` and `.project-memory/timeline.md`.

## Decisions to Preserve

- Status de pedidos usa valores sem espaço (EntregueNaoPago, EntreguePago) para compatibilidade com MySQL enum e TypeScript. Estoque reserva apenas no dia exato de dataEntrega, não indefinidamente no futuro. dataColeta foi removida — coleta é sempre dataEntrega+1 dia (ou coletaAdiadaPara se preenchido). Endereço dividido em 3 campos estruturados para facilitar agrupamento por bairro na Logística.

## Known Bugs, Fixes, and Risks

- Corrigida reserva de estoque que bloqueava agenda inteira para o futuro (lte -> eq na query de estoqueUtils). Corrigido onSuccess em useQuery substituído por useEffect no Logistica.tsx.

No risks recorded.

## Next Actions

- Implementar permissões de acesso por role para colaboradores. Adicionar card de comissões pendentes no Dashboard. Criar relatório exportável em CSV.

## Resume Instruction for Next Session

Start by running `python /home/ubuntu/skills/github-project-checkpoints/scripts/restore_context.py --repo .`, read this file, inspect the latest checkpoint, then continue with the first item in **Next Actions** unless the user gives newer instructions.
