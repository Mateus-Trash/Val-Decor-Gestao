
## 2026-07-06 05:10:29 +0000

**Decisions:**

- Usar cores de status para visual feedback em todo o calendário

## 2026-07-06 18:37:06 +0000

**Decisions:**

- Status de pedidos usa valores sem espaço (EntregueNaoPago, EntreguePago) para compatibilidade com MySQL enum e TypeScript. Estoque reserva apenas no dia exato de dataEntrega, não indefinidamente no futuro. dataColeta foi removida — coleta é sempre dataEntrega+1 dia (ou coletaAdiadaPara se preenchido). Endereço dividido em 3 campos estruturados para facilitar agrupamento por bairro na Logística.

---

## Preferências do Usuário (Marlon Breno)

- **Comunicação**: Direto e técnico. Respostas curtas com o resultado, sem explicações longas.
- **Commits**: Sempre fazer commit + push para GitHub após cada feature concluída, sem precisar pedir.
- **Checkpoint Manus**: Sempre salvar checkpoint Manus junto com o commit GitHub.
- **Idioma**: Português brasileiro em toda comunicação e nos labels da UI.
- **Testes**: Exige `pnpm check` e `pnpm test` sem erros antes de qualquer entrega.
- **Banco de dados**: Prefere aplicar migrations via `webdev_execute_sql` quando `drizzle-kit generate` trava.
- **Edições cirúrgicas**: Nunca reescrever arquivos inteiros desnecessariamente — editar apenas os trechos necessários.
- **Sem invenções**: Não adicionar features, páginas ou mudanças estruturais além do que foi pedido explicitamente.

## Decisões Técnicas Consolidadas

### Status de Pedidos
- Enum: `["Pendente", "Confirmado", "EntregueNaoPago", "EntreguePago", "Concluido"]`
- Labels amigáveis via `statusLabels` no frontend
- Cores: Pendente=amarelo, Confirmado=azul, EntregueNaoPago=vermelho forte, EntreguePago=vermelho claro, Concluido=verde

### Sistema de Estoque
- Reserva apenas no **dia exato de `dataEntrega`** (eq, não lte)
- `dataColeta` removida — coleta = `dataEntrega + 1 dia` (ou `coletaAdiadaPara` se preenchido)
- `status != Concluido` libera o item no mesmo dia se concluído

### Endereço de Entrega
- 3 campos: `ruaEntrega` (varchar 255), `bairroEntrega` (varchar 120), `numeroEntrega` (varchar 20)
- Exibição: "Rua, Número — Bairro"
- Agrupamento por bairro na Logística para otimização de rota

### Comissões
- Calculadas automaticamente ao mudar status para "Concluido"
- Campos `pago` (boolean, default false) e `dataPagamento` (timestamp nullable)
- Não alterar lógica de cálculo — só gerenciar status de pagamento

### Logística
- Visão derivada dos pedidos (não tabela manual)
- Entregas: `DATE(dataEntrega) = data AND status != Concluido`
- Coletas: `coletaAdiadaPara` se preenchido, senão `dataEntrega + 1 dia`
- Postergar coleta: mutation `postergarColeta` incrementa +1 dia

### Padrões de Código
- Stack: React 19 + Tailwind 4 + Express 4 + tRPC 11 + Drizzle ORM + MySQL
- Routers em `server/routers/<feature>Router.ts`
- Responsividade: `hidden sm:block` desktop, `block sm:hidden` mobile
- Não usar `onSuccess` em `useQuery` — usar `useEffect`
