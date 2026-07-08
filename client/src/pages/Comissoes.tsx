import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Wallet, CheckCircle2, Clock, Calendar, DollarSign } from "lucide-react";
import EntityCard from "@/components/EntityCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/PageHeading";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Comissao = {
  id: number;
  colaboradorId: number;
  colaboradorNome: string | null;
  pedidoId: number;
  pedidoCliente: string;
  pedidoDataEvento: Date | string;
  valor: number;
  dataCalculo: Date | string;
  pago: boolean;
  dataPagamento: Date | string | null;
};

function formatCurrency(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
}

export default function Comissoes() {
  const [filtroColaborador, setFiltroColaborador] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const utils = trpc.useUtils();

  const { data: colaboradoresList = [] } = trpc.colaboradores.list.useQuery();
  const { data: todasComissoes = [], isLoading } = trpc.comissoes.list.useQuery();

  const marcarPagaMutation = trpc.comissoes.marcarComoPaga.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.updated} comissão(ões) marcada(s) como paga`);
      setSelected(new Set());
      utils.comissoes.list.invalidate();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const marcarPendenteMutation = trpc.comissoes.marcarComoPendente.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.updated} comissão(ões) marcada(s) como pendente`);
      setSelected(new Set());
      utils.comissoes.list.invalidate();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const comissoesFiltradas = useMemo(() => {
    return (todasComissoes as Comissao[]).filter((c) => {
      const matchColaborador =
        filtroColaborador === "todos" || c.colaboradorId === Number(filtroColaborador);
      const matchStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "pago" && c.pago) ||
        (filtroStatus === "pendente" && !c.pago);
      return matchColaborador && matchStatus;
    });
  }, [todasComissoes, filtroColaborador, filtroStatus]);

  const totalPendente = useMemo(
    () => comissoesFiltradas.filter((c) => !c.pago).reduce((s, c) => s + c.valor, 0),
    [comissoesFiltradas]
  );
  const totalPago = useMemo(
    () => comissoesFiltradas.filter((c) => c.pago).reduce((s, c) => s + c.valor, 0),
    [comissoesFiltradas]
  );

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(comissoesFiltradas.map((c) => c.id)) : new Set());
  }

  const allSelected =
    comissoesFiltradas.length > 0 &&
    comissoesFiltradas.every((c) => selected.has(c.id));

  const selectedIds = Array.from(selected);
  const isPending = marcarPagaMutation.isPending || marcarPendenteMutation.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* Header */}
        <PageHeading icon={<Wallet className="h-6 sm:h-7 w-6 sm:w-7 text-primary" />} title="Comissões" />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Select value={filtroColaborador} onValueChange={(v) => { setFiltroColaborador(v); setSelected(new Set()); }}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Colaborador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os colaboradores</SelectItem>
              {colaboradoresList.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroStatus} onValueChange={(v) => { setFiltroStatus(v); setSelected(new Set()); }}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-yellow-400">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Total Pendente
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPendente)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-400">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Total Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPago)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Action Toolbar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg border">
            <span className="text-sm text-muted-foreground">
              {selected.size} selecionada(s)
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => marcarPagaMutation.mutate({ ids: selectedIds })}
              disabled={isPending}
              className="gap-1.5 border-green-400 text-green-700 hover:bg-green-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Marcar como paga
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => marcarPendenteMutation.mutate({ ids: selectedIds })}
              disabled={isPending}
              className="gap-1.5 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
            >
              <Clock className="h-4 w-4" />
              Marcar como pendente
            </Button>
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden sm:block">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : comissoesFiltradas.length === 0 ? (
                <EmptyState icon={Wallet} message="Nenhuma comissão encontrada para os filtros selecionados." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(v) => toggleAll(!!v)}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Data Cálculo</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Data Pagamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comissoesFiltradas.map((c) => (
                      <TableRow
                        key={c.id}
                        className={`transition-colors duration-200 hover:bg-muted/50 ${selected.has(c.id) ? "bg-muted/40" : ""}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selected.has(c.id)}
                            onCheckedChange={() => toggleOne(c.id)}
                            aria-label={`Selecionar comissão ${c.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{c.colaboradorNome ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          #{c.pedidoId} — {c.pedidoCliente}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(c.valor)}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(c.dataCalculo)}</TableCell>
                        <TableCell className="text-center">
                          {c.pago ? (
                            <Badge className="bg-green-100 text-green-800 border-green-300 border text-xs dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                              Pago
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 border text-xs dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(c.dataPagamento)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mobile Cards */}
        <div className="block sm:hidden space-y-2">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : comissoesFiltradas.length === 0 ? (
            <EmptyState icon={Wallet} message="Nenhuma comissão encontrada." />
          ) : (
            comissoesFiltradas.map((c) => (
              <EntityCard
                key={c.id}
                title={c.colaboradorNome ?? "—"}
                subtitle={`#${c.pedidoId} — ${c.pedidoCliente}`}
                badge={
                  c.pago ? (
                    <Badge className="bg-green-100 text-green-800 border-green-300 border text-xs shrink-0 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                      Pago
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 border text-xs shrink-0 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
                      Pendente
                    </Badge>
                  )
                }
                fields={[
                  { icon: DollarSign, label: "Valor", value: formatCurrency(c.valor) },
                  { icon: Calendar, label: "Calculado", value: formatDate(c.dataCalculo) },
                ]}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selected.has(c.id)}
                    onCheckedChange={() => toggleOne(c.id)}
                    aria-label={`Selecionar comissão ${c.id}`}
                    className="shrink-0"
                  />
                  <span className="text-xs text-muted-foreground">Selecionar</span>
                </div>
                {c.pago && c.dataPagamento && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Pago em: {formatDate(c.dataPagamento)}
                  </p>
                )}
              </EntityCard>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
