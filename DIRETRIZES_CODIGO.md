# Diretrizes de Código — Val Decor Gestão

## 📋 Índice
1. [Arquitetura Geral](#arquitetura-geral)
2. [Estrutura de Pastas](#estrutura-de-pastas)
3. [Convenções de Nomenclatura](#convenções-de-nomenclatura)
4. [Padrões de Código](#padrões-de-código)
5. [Banco de Dados](#banco-de-dados)
6. [Backend (tRPC Routers)](#backend-trpc-routers)
7. [Frontend (React)](#frontend-react)
8. [Testes](#testes)
9. [Commits e Versionamento](#commits-e-versionamento)
10. [Checklist de Qualidade](#checklist-de-qualidade)

---

## Arquitetura Geral

### Stack Tecnológico
- **Frontend**: React 19 + Tailwind CSS 4 + shadcn/ui
- **Backend**: Express 4 + tRPC 11 + Drizzle ORM
- **Banco de Dados**: MySQL/TiDB
- **Autenticação**: Manus OAuth
- **Testes**: Vitest
- **Build**: Vite + esbuild

### Fluxo de Dados
```
React Component → tRPC Hook (useQuery/useMutation)
                    ↓
                tRPC Client
                    ↓
                HTTP POST /api/trpc
                    ↓
                tRPC Router (server/routers.ts)
                    ↓
                Database Query (Drizzle ORM)
                    ↓
                Response (SuperJSON serialized)
```

---

## Estrutura de Pastas

```
val-decor-gestao-deploy/
├── client/
│   ├── public/                    # Apenas favicon.ico, robots.txt, manifest.json
│   ├── src/
│   │   ├── _core/                 # Hooks e contextos internos (NÃO EDITAR)
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui components (NÃO EDITAR)
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── NovoPedidoDialog.tsx
│   │   │   ├── AIChatBox.tsx
│   │   │   └── Map.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Calendario.tsx
│   │   │   ├── Colaboradores.tsx
│   │   │   ├── Itens.tsx
│   │   │   ├── Kits.tsx
│   │   │   ├── Estoque.tsx
│   │   │   ├── Pedidos.tsx
│   │   │   ├── Logistica.tsx
│   │   │   ├── Financeiro.tsx
│   │   │   └── NotFound.tsx
│   │   ├── hooks/
│   │   │   ├── useComposition.ts
│   │   │   └── useMobile.tsx
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx
│   │   ├── lib/
│   │   │   ├── trpc.ts
│   │   │   └── utils.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   └── const.ts
│   └── index.html
├── server/
│   ├── _core/                     # Framework plumbing (NÃO EDITAR)
│   ├── routers/
│   │   ├── colaboradoresRouter.ts
│   │   ├── itensRouter.ts
│   │   ├── kitsRouter.ts
│   │   ├── pedidosRouter.ts
│   │   ├── financeirosRouter.ts
│   │   ├── comissoesRouter.ts
│   │   ├── entregasColetasRouter.ts
│   │   └── dashboardRouter.ts
│   ├── db.ts                      # Query helpers
│   ├── estoqueUtils.ts            # Stock reservation logic
│   ├── routers.ts                 # Main router aggregation
│   ├── storage.ts                 # S3 helpers
│   └── routers.test.ts            # Vitest tests
├── drizzle/
│   ├── schema.ts                  # Database schema (Drizzle)
│   ├── relations.ts               # Table relationships
│   └── migrations/                # SQL migration files
├── shared/
│   ├── types.ts                   # Shared types
│   ├── const.ts                   # Shared constants
│   └── _core/errors.ts            # Error definitions
├── references/                    # Integration guides
│   ├── llm-integration.md
│   ├── file-storage.md
│   ├── image-generation.md
│   ├── voice-transcription.md
│   ├── maps-integration.md
│   ├── data-api.md
│   ├── owner-notifications.md
│   └── manus-oauth.md
├── drizzle.config.ts
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── package.json
├── pnpm-lock.yaml
└── todo.md                        # Project tracking
```

---

## Convenções de Nomenclatura

### Arquivos
- **Componentes React**: `PascalCase.tsx` (ex: `DashboardLayout.tsx`, `NovoPedidoDialog.tsx`)
- **Páginas**: `PascalCase.tsx` (ex: `Pedidos.tsx`, `Calendario.tsx`)
- **Hooks**: `camelCase.ts` (ex: `useComposition.ts`, `useMobile.tsx`)
- **Utilitários**: `camelCase.ts` (ex: `estoqueUtils.ts`, `db.ts`)
- **Routers**: `camelCaseRouter.ts` (ex: `pedidosRouter.ts`, `colaboradoresRouter.ts`)
- **Testes**: `*.test.ts` (ex: `routers.test.ts`)

### Variáveis e Funções
- **Funções**: `camelCase` (ex: `getSituacao()`, `getDisponibilidadePorData()`)
- **Constantes**: `UPPER_SNAKE_CASE` (ex: `STATUS_COLORS`, `COOKIE_NAME`)
- **Booleanos**: prefixo `is` ou `has` (ex: `isLoading`, `hasPermission`)
- **Enums**: `PascalCase` (ex: `ItemStatus`, `UserRole`)

### Banco de Dados
- **Tabelas**: `camelCase` (ex: `colaboradores`, `itensPedido`, `transacoesFinanceiras`)
- **Colunas**: `camelCase` (ex: `nomeCliente`, `valorAluguel`, `dataEntrega`)
- **Tipos Drizzle**: `PascalCase` (ex: `User`, `Pedido`, `Item`)

---

## Padrões de Código

### Imports
```typescript
// 1. React e bibliotecas externas
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// 2. Componentes UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 3. Componentes customizados
import DashboardLayout from "@/components/DashboardLayout";

// 4. tRPC e hooks
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// 5. Ícones
import { Package, Plus, Pencil, Trash2 } from "lucide-react";

// 6. Validação e tipos
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// 7. Notificações
import { toast } from "sonner";
```

### Componentes React
```typescript
// Padrão de página com DashboardLayout
export default function NomePagina() {
  const [estado, setEstado] = useState<Tipo>(inicial);
  const utils = trpc.useUtils();

  // Queries
  const { data: items = [], isLoading } = trpc.router.list.useQuery();

  // Mutations
  const createMutation = trpc.router.create.useMutation({
    onSuccess: () => {
      toast.success("Sucesso!");
      utils.router.list.invalidate();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  // Handlers
  function handleCreate(data: FormData) {
    createMutation.mutate(data);
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <IconComponent className="h-6 sm:h-7 w-6 sm:w-7 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Título</h1>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo
          </Button>
        </div>

        {/* Conteúdo */}
        {/* Desktop: Table */}
        <Card className="hidden sm:block">
          {/* ... */}
        </Card>

        {/* Mobile: Cards */}
        <div className="block sm:hidden space-y-3">
          {/* ... */}
        </div>
      </div>
    </DashboardLayout>
  );
}
```

### Responsividade
```typescript
// Sempre usar: hidden sm:block (desktop) + block sm:hidden (mobile)
<Card className="hidden sm:block">
  {/* Desktop Table */}
</Card>

<div className="block sm:hidden space-y-3">
  {/* Mobile Cards */}
</div>

// Padding responsivo
<div className="p-3 sm:p-6">

// Texto responsivo
<h1 className="text-xl sm:text-2xl font-bold">

// Flexbox responsivo
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
```

### Cores e Badges
```typescript
// Padrão de cores para status
const statusColors = {
  Pendente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Confirmado: "bg-blue-100 text-blue-800 border-blue-300",
  EntregueNaoPago: "bg-red-200 text-red-900 border-red-400",
  EntreguePago: "bg-red-100 text-red-700 border-red-300",
  Concluido: "bg-green-100 text-green-800 border-green-300",
};

// Uso
<Badge className={statusColors[status]}>
  {statusLabels[status]}
</Badge>
```

---

## Banco de Dados

### Schema (drizzle/schema.ts)
```typescript
// Padrão de tabela
export const nomeTabela = mysqlTable("nomeTabela", {
  id: int("id").autoincrement().primaryKey(),
  campo1: varchar("campo1", { length: 255 }).notNull(),
  campo2: text("campo2"),
  campo3: int("campo3").default(0),
  campo4: mysqlEnum("campo4", ["opcao1", "opcao2"]).default("opcao1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NomeTabela = typeof nomeTabela.$inferSelect;
export type InsertNomeTabela = typeof nomeTabela.$inferInsert;
```

### Relações (drizzle/relations.ts)
```typescript
export const nomeTabelaRelations = relations(nomeTabela, ({ many, one }) => ({
  outrosRegistros: many(outroTabela),
  registroPai: one(tabelaPai, {
    fields: [nomeTabela.tabelaPaiId],
    references: [tabelaPai.id],
  }),
}));
```

### Query Helpers (server/db.ts)
```typescript
// Padrão de helper
export async function getItemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(itens)
    .where(eq(itens.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}
```

### Migrations
```bash
# Gerar migration a partir de schema.ts
pnpm drizzle-kit generate

# Revisar SQL gerado em drizzle/migrations/
# Aplicar via webdev_execute_sql
```

---

## Backend (tRPC Routers)

### Estrutura de Router
```typescript
import { router, publicProcedure, protectedProcedure } from "@/_core/trpc";
import { z } from "zod";
import { db } from "../db";

export const nomeRouter = router({
  list: publicProcedure
    .query(async () => {
      // Lógica de leitura
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      // Lógica de leitura por ID
    }),

  create: protectedProcedure
    .input(z.object({
      campo1: z.string().min(1),
      campo2: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validação de permissão
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Lógica de criação
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      campo1: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Lógica de atualização
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Validação de integridade
      // Lógica de deleção
    }),
});
```

### Validação de Permissões
```typescript
// Apenas admin
if (ctx.user.role !== "admin") {
  throw new TRPCError({ code: "FORBIDDEN" });
}

// Apenas proprietário ou admin
if (ctx.user.id !== recurso.userId && ctx.user.role !== "admin") {
  throw new TRPCError({ code: "FORBIDDEN" });
}
```

### Tratamento de Erros
```typescript
import { TRPCError } from "@trpc/server";

throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Descrição do erro",
});

// Códigos comuns:
// "BAD_REQUEST" - Validação falhou
// "UNAUTHORIZED" - Não autenticado
// "FORBIDDEN" - Sem permissão
// "NOT_FOUND" - Recurso não existe
// "CONFLICT" - Conflito de dados
// "INTERNAL_SERVER_ERROR" - Erro do servidor
```

---

## Frontend (React)

### Hooks tRPC
```typescript
// Query (leitura)
const { data, isLoading, error } = trpc.router.list.useQuery();

// Mutation (escrita)
const mutation = trpc.router.create.useMutation({
  onSuccess: (data) => {
    toast.success("Sucesso!");
    utils.router.list.invalidate();
  },
  onError: (error) => {
    toast.error(`Erro: ${error.message}`);
  },
});

// Invalidar cache
const utils = trpc.useUtils();
utils.router.list.invalidate();
```

### Formulários
```typescript
const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  valor: z.number().positive("Valor deve ser positivo"),
});

type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});

function onSubmit(data: FormData) {
  mutation.mutate(data);
}

return (
  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
    <div>
      <Label htmlFor="nome">Nome</Label>
      <Input id="nome" {...register("nome")} />
      {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
    </div>
  </form>
);
```

### Tratamento de Estados
```typescript
// Loading
{isLoading ? (
  <p className="text-center py-8 text-muted-foreground">Carregando...</p>
) : items.length === 0 ? (
  <p className="text-center py-8 text-muted-foreground">Nenhum registro encontrado.</p>
) : (
  // Renderizar items
)}

// Erro
{error && (
  <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded">
    {error.message}
  </div>
)}
```

---

## Testes

### Estrutura de Teste (Vitest)
```typescript
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("nomeRouter", () => {
  it("should list items", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.nomeRouter.list();
    
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("should create item with valid input", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.nomeRouter.create({
      campo1: "valor1",
      campo2: 100,
    });
    
    expect(result.id).toBeDefined();
    expect(result.campo1).toBe("valor1");
  });

  it("should throw error with invalid input", async () => {
    const caller = appRouter.createCaller(ctx);
    
    await expect(
      caller.nomeRouter.create({ campo1: "" })
    ).rejects.toThrow();
  });
});
```

### Executar Testes
```bash
# Rodar todos os testes
pnpm test

# Modo watch
pnpm test --watch

# Teste específico
pnpm test routers.test.ts
```

---

## Commits e Versionamento

### Mensagens de Commit
```
feat: adicionar nova página de estoque
fix: corrigir cálculo de disponibilidade por data
refactor: reorganizar lógica de estoque em estoqueUtils.ts
docs: atualizar diretrizes de código
test: adicionar testes para validação de estoque
chore: atualizar dependências
```

### Workflow de Desenvolvimento
```bash
# 1. Criar branch
git checkout -b feature/nome-feature

# 2. Fazer alterações
# 3. Testar
pnpm check
pnpm test

# 4. Commit
git add -A
git commit -m "feat: descrição da feature"

# 5. Push
git push origin feature/nome-feature

# 6. Merge via GitHub (Pull Request)
```

---

## Checklist de Qualidade

### Antes de Commit
- [ ] `pnpm check` sem erros TypeScript
- [ ] `pnpm test` com 100% de testes passando
- [ ] Código segue as convenções de nomenclatura
- [ ] Componentes responsivos (desktop + mobile)
- [ ] Mensagens de erro claras e em português
- [ ] Sem console.log ou debugger deixados
- [ ] Imports organizados e sem unused
- [ ] Comentários JSDoc em funções complexas

### Antes de Merge
- [ ] Feature testada manualmente no browser
- [ ] Sem erros no console do browser
- [ ] Sem erros no dev server
- [ ] Checkpoint criado com descrição clara
- [ ] GitHub atualizado com push
- [ ] todo.md atualizado com status

### Antes de Deploy
- [ ] Todos os checkpoints anteriores completos
- [ ] Dados de teste zerados (se necessário)
- [ ] Variáveis de ambiente configuradas
- [ ] Testes de integração passando
- [ ] Performance aceitável (< 3s load time)

---

## Recursos Adicionais

- **Documentação tRPC**: https://trpc.io
- **Documentação Drizzle**: https://orm.drizzle.team
- **Documentação shadcn/ui**: https://ui.shadcn.com
- **Documentação Tailwind**: https://tailwindcss.com
- **Documentação React Hook Form**: https://react-hook-form.com
- **Documentação Zod**: https://zod.dev

---

**Última atualização**: 06/07/2026
**Versão**: 1.0.0
