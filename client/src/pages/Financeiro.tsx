import { useState, useMemo } from "react";
import { dismissKeyboardOnEnter } from "@/lib/formUtils";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { DollarSign, Plus, Pencil, Trash2, TrendingUp, TrendingDown, Truck, MoreVertical, ChevronDown, ChevronUp, Calendar, User, FileText, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/PageHeading";
import { EmptyState } from "@/components/EmptyState";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const despesaSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valor: z.number().positive("Valor deve ser positivo"),
  data: z.string().min(1, "Data é obrigatória"),
});

type DespesaForm = z.infer<typeof despesaSchema>;

const tipoBadge: Record<string, { label: string; className: string }> = {
  receita: { label: "Receita", className: "bg-green-100 text-green-800 border-green-300" },
  despesa: { label: "Despesa", className: "bg-red-100 text-red-800 border-red-300" },
  taxa_entrega: { label: "Taxa Entrega", className: "bg-blue-100 text-blue-800 border-blue-300" },
};

const tipoOptions = [
  { value: "todos", label: "Todos os tipos" },
  { value: "receita", label: "Receita" },
  { value: "despesa", label: "Despesa" },
  { value: "taxa_entrega", label: "Taxa de Entrega" },
];

export default function Financeiro() {
  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroColaborador, setFiltroColaborador] = useState<string>("todos");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { dataInicio, dataFim } = useMemo(() => {
    const base = new Date(anoSelecionado, mesSelecionado, 1);
    return {
      dataInicio: startOfMonth(base),
      dataFim: endOfMonth(base),
    };
  }, [mesSelecionado, anoSelecionado]);

  const { data: periodo, isLoading } = trpc.financeiros.listByPeriodo.useQuery({
    dataInicio,
    dataFim,
  });

  const { data: colaboradoresList = [] } = trpc.colaboradores.list.useQuery();

  const transacoesBrutas = periodo?.transacoes ?? [];
  const totalReceitas = periodo?.totalReceitas ?? 0;
  const totalDespesas = periodo?.totalDespesas ?? 0;
  const totalTaxas = periodo?.totalTaxas ?? 0;
  const saldo = periodo?.saldo ?? 0;

  // Filtros client-side por tipo e colaborador
  const transacoes = useMemo(() => {
    return transacoesBrutas.filter((t) => {
      const matchTipo = filtroTipo === "todos" || t.tipo === filtroTipo;
      const matchColab = filtroColaborador === "todos" ||
        (t.colaboradorId != null && t.colaboradorId === Number(filtroColaborador));
      return matchTipo && matchColab;
    });
  }, [transacoesBrutas, filtroTipo, filtroColaborador]);

  const createMutation = trpc.financeiros.create.useMutation({
    onSuccess: () => {
      toast.success("Despesa lançada!");
      utils.financeiros.listByPeriodo.invalidate();
      fecharDialog();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const updateMutation = trpc.financeiros.update.useMutation({
    onSuccess: () => {
      toast.success("Transação atualizada!");
      utils.financeiros.listByPeriodo.invalidate();
      fecharDialog();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const deleteMutation = trpc.financeiros.delete.useMutation({
    onSuccess: () => {
      toast.success("Transação removida!");
      utils.financeiros.listByPeriodo.invalidate();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DespesaForm, unknown, DespesaForm>({
    resolver: zodResolver(despesaSchema),
  });

  function fecharDialog() {
    setDialogOpen(false);
    setEditandoId(null);
    reset();
  }

  function abrirNovaDespesa() {
    setEditandoId(null);
    reset({
      descricao: "",
      valor: undefined as unknown as number,
      data: format(new Date(), "yyyy-MM-dd"),
    });
    setDialogOpen(true);
  }

  function abrirEditar(t: typeof transacoes[number]) {
    setEditandoId(t.id);
    reset({
      descricao: t.descricao ?? "",
      valor: t.valor / 100,
      data: format(new Date(t.data), "yyyy-MM-dd"),
    });
    setDialogOpen(true);
  }

  function confirmarDelete(id: number) {
    if (window.confirm("Deseja remover esta transação?")) {
      deleteMutation.mutate({ id });
    }
  }

  function onSubmit(data: DespesaForm) {
    const valorCentavos = Math.round(data.valor * 100);
    if (editandoId !== null) {
      updateMutation.mutate({
        id: editandoId,
        descricao: data.descricao,
        valor: valorCentavos,
        data: new Date(data.data + "T12:00:00"),
      });
    } else {
      createMutation.mutate({
        tipo: "despesa",
        descricao: data.descricao,
        valor: valorCentavos,
        data: new Date(data.data + "T12:00:00"),
      });
    }
  }

  function formatCurrency(value: number) {
    return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  const anosDisponiveis = Array.from({ length: 6 }, (_, i) => hoje.getFullYear() - 3 + i);
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* Header */}
        <PageHeading icon={<DollarSign className="h-6 sm:h-7 w-6 sm:w-7 text-primary" />} title="Financeiro">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Select
              value={String(mesSelecionado)}
              onValueChange={(v) => setMesSelecionado(Number(v))}
            >
              <SelectTrigger className="flex-1 sm:flex-none sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(anoSelecionado)}
              onValueChange={(v) => setAnoSelecionado(Number(v))}
            >
              <SelectTrigger className="flex-1 sm:flex-none sm:w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anosDisponiveis.map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={abrirNovaDespesa} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nova Despesa
            </Button>
          </div>
        </PageHeading>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="gap-2 border-green-200">
            <CardHeader className="pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Receitas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <p className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(totalReceitas)}</p>
            </CardContent>
          </Card>

          <Card className="gap-2 border-red-200">
            <CardHeader className="pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Despesas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <p className="text-lg sm:text-2xl font-bold text-red-600">{formatCurrency(totalDespesas)}</p>
            </CardContent>
          </Card>

          <Card className="gap-2 border-blue-200">
            <CardHeader className="pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-600" />
                Taxas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{formatCurrency(totalTaxas)}</p>
            </CardContent>
          </Card>

          <Card className={"gap-2 " + (saldo >= 0 ? "border-green-200" : "border-red-200")}>
            <CardHeader className="pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className={"h-4 w-4 " + (saldo >= 0 ? "text-green-600" : "text-red-600")} />
                Saldo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <p className={"text-lg sm:text-2xl font-bold " + (saldo >= 0 ? "text-green-600" : "text-red-600")}>
                {formatCurrency(saldo)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {tipoOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroColaborador} onValueChange={setFiltroColaborador}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Colaborador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os colaboradores</SelectItem>
              {colaboradoresList.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela Desktop */}
        <Card className="gap-2 hidden sm:block">
          <CardHeader>
            <CardTitle>
              Transações — {MESES[mesSelecionado]} {anoSelecionado}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transacoes.length === 0 ? (
              <EmptyState icon={DollarSign} message="Nenhuma transação neste período." actionLabel="Nova Despesa" onAction={abrirNovaDespesa} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transacoes.map((t) => {
                      const badge = tipoBadge[t.tipo] ?? { label: t.tipo, className: "" };
                      const isManual = t.pedidoId === null;
                      return (
                        <TableRow key={t.id} className="transition-colors duration-200 hover:bg-muted/50">
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(t.data), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{t.descricao ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={"text-xs " + badge.className}>
                              {badge.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {t.colaboradorNome ? (
                              <span className="text-sm">{t.colaboradorNome}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {t.pedidoId ? (
                              <span className="text-primary font-mono text-sm">#{t.pedidoId}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className={"text-right font-medium " + (t.tipo === "despesa" ? "text-red-600" : "text-green-600")}>
                            {t.tipo === "despesa" ? "−" : "+"}{formatCurrency(t.valor)}
                          </TableCell>
                          <TableCell className="text-right">
                            {isManual ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => abrirEditar(t)}>
                                    <Pencil className="h-4 w-4 mr-2" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => confirmarDelete(t.id)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <span className="text-xs text-muted-foreground">Auto</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista Mobile — linhas expansíveis com detalhes */}
        <div className="block sm:hidden">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : transacoes.length === 0 ? (
            <EmptyState icon={DollarSign} message="Nenhuma transação neste período." actionLabel="Nova Despesa" onAction={abrirNovaDespesa} />
          ) : (
            <div className="divide-y divide-border">
              {transacoes.map((t) => {
                const badge = tipoBadge[t.tipo] ?? { label: t.tipo, className: "" };
                const isManual = t.pedidoId === null;
                const valorClass = t.tipo === "despesa" ? "text-red-600" : "text-green-600";
                const isExpanded = expandedId === t.id;
                return (
                  <div key={t.id}>
                    <div
                      className="flex items-center gap-2 py-2.5 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : t.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{t.descricao || "—"}</span>
                          <Badge variant="outline" className={"text-[10px] px-1.5 py-0 shrink-0 " + badge.className}>
                            {badge.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(t.data), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <span className={"text-sm font-semibold shrink-0 " + valorClass}>
                        {t.tipo === "despesa" ? "−" : "+"}{formatCurrency(t.valor)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    {isExpanded && (
                      <div className="pb-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Colaborador:</span>
                            <span className="font-medium truncate">{t.colaboradorNome || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Pedido:</span>
                            <span className="font-medium font-mono">{t.pedidoId ? "#" + t.pedidoId : "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Data:</span>
                            <span className="font-medium">{format(new Date(t.data), "dd/MM/yyyy", { locale: ptBR })}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Origem:</span>
                            <span className="font-medium">{isManual ? "Manual" : "Automática"}</span>
                          </div>
                        </div>
                        {t.pedidoCliente && (
                          <p className="text-xs text-muted-foreground">
                            Cliente: <span className="font-medium text-foreground">{t.pedidoCliente}</span>
                          </p>
                        )}
                        {isManual && (
                          <div className="flex gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={(e) => { e.stopPropagation(); abrirEditar(t); }}
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 text-destructive"
                              onClick={(e) => { e.stopPropagation(); confirmarDelete(t.id); }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Excluir
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dialog nova despesa / editar */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) fecharDialog(); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {editandoId !== null ? "Editar Transação" : "Nova Despesa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} onKeyDown={dismissKeyboardOnEnter} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                {...register("descricao")}
                placeholder="Ex: Compra de materiais"
              />
              {errors.descricao && (
                <p className="text-sm text-destructive">{errors.descricao.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step={0.01}
                min={0.01}
                {...register("valor", { valueAsNumber: true })}
                placeholder="0,00"
              />
              {errors.valor && (
                <p className="text-sm text-destructive">{errors.valor.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="data">Data *</Label>
              <Input id="data" type="date" {...register("data")} />
              {errors.data && (
                <p className="text-sm text-destructive">{errors.data.message}</p>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={fecharDialog} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : editandoId !== null ? "Salvar" : "Lançar Despesa"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
