import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  BarChart3,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { PageHeading } from "@/components/PageHeading";
import { Link } from "wouter";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { label: string; color: string; bgClass: string }> = {
  Pendente: { label: "Pendente", color: "#eab308", bgClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800" },
  Confirmado: { label: "Confirmado", color: "#3b82f6", bgClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" },
  EntregueNaoPago: { label: "Entregue (Não Pago)", color: "#dc2626", bgClass: "bg-red-200 text-red-900 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800" },
  EntreguePago: { label: "Entregue (Pago)", color: "#f87171", bgClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800" },
  Concluido: { label: "Concluído", color: "#22c55e", bgClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800" },
};

const PIE_COLORS = ["#eab308", "#3b82f6", "#dc2626", "#f87171", "#22c55e"];

const fluxoChartConfig = {
  Receitas: { label: "Receitas", color: "#22c55e" },
  Despesas: { label: "Despesas", color: "#ef4444" },
} satisfies ChartConfig;

const top5ChartConfig = {
  quantidade: { label: "Quantidade", color: "var(--chart-1)" },
} satisfies ChartConfig;

function formatCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());

  const { dataInicio, dataFim } = useMemo(() => {
    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0, 23, 59, 59);
    return { dataInicio, dataFim };
  }, [mes, ano]);

  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.getKPIs.useQuery({
    dataInicio,
    dataFim,
  });

  const { data: comparativo, isLoading: compLoading } = trpc.dashboard.getComparativoMensal.useQuery({
    mes,
    ano,
  });

  const { data: fluxo, isLoading: fluxoLoading } = trpc.dashboard.getFluxoCaixaMensal.useQuery({
    mes,
    ano,
  });

  const { data: ranking, isLoading: rankingLoading } = trpc.dashboard.getRankingColaboradores.useQuery({
    dataInicio,
    dataFim,
  });

  const { data: alertasColeta = [] } = trpc.itens.getAlertasColeta.useQuery();

  const meses = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1),
      label: format(new Date(2024, i, 1), "MMMM", { locale: ptBR }),
    }));
  }, []);

  const anos = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => String(anoAtual - 2 + i));
  }, []);

  // Dados para gráfico de fluxo
  const fluxoData = useMemo(() => {
    if (!fluxo) return [];
    return fluxo.map((s) => ({
      semana: `Sem ${s.semana}`,
      Receitas: s.receitas / 100,
      Despesas: s.despesas / 100,
    }));
  }, [fluxo]);

  // Dados para gráfico de barras (top 5 itens)
  const top5Data = useMemo(() => {
    if (!kpis?.top5Itens) return [];
    return kpis.top5Itens.map((item) => ({
      nome: item.nome,
      quantidade: item.totalQuantidade,
    }));
  }, [kpis]);

  // Dados para gráfico de pizza (pedidos por status)
  const pieData = useMemo(() => {
    if (!kpis?.pedidosPorStatus) return [];
    return kpis.pedidosPorStatus.map((p) => ({
      name: STATUS_COLORS[p.status]?.label ?? p.status,
      value: p.count,
      status: p.status,
    }));
  }, [kpis]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header + Filtro */}
        <PageHeading icon={<BarChart3 className="h-6 sm:h-7 w-6 sm:w-7 text-primary" />} title="Dashboard">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger className="flex-1 sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="flex-1 sm:w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anos.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PageHeading>

        {/* Cards de KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Faturamento do Mês"
            value={kpis ? kpis.faturamentoTotal : null}
            formatFn={formatCentavos}
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
            loading={kpisLoading}
            accentClassName="border-l-4 border-l-green-500"
            trend={
              comparativo
                ? {
                    direction: comparativo.percentualVariacao >= 0 ? "up" : "down",
                    percent: comparativo.percentualVariacao,
                  }
                : undefined
            }
            footerNote="vs. mês anterior"
          />
          <StatCard
            title="Faturamento até Hoje"
            value={kpis ? kpis.faturamentoAteHoje : null}
            formatFn={formatCentavos}
            icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
            loading={kpisLoading}
            accentClassName="border-l-4 border-l-emerald-500"
            footerNote="Aluguéis já realizados no período, sem contar o restante do mês"
          />
          <StatCard
            title="Saldo do Mês"
            value={kpis ? kpis.saldo : null}
            formatFn={formatCentavos}
            icon={<DollarSign className="h-5 w-5" />}
            loading={kpisLoading}
            accentClassName={`border-l-4 ${kpis && kpis.saldo >= 0 ? "border-l-green-500" : "border-l-red-500"}`}
            valueClassName={kpis && kpis.saldo < 0 ? "text-red-600" : "text-green-600"}
            footerNote="Receitas menos despesas no período"
          />
          <StatCard
            title="Total de Despesas"
            value={kpis ? kpis.totalDespesas : null}
            formatFn={formatCentavos}
            icon={<TrendingDown className="h-5 w-5 text-red-600" />}
            loading={kpisLoading}
            accentClassName="border-l-4 border-l-red-500"
            valueClassName="text-red-600"
            footerNote="No período selecionado"
          />
          <StatCard
            title="Taxas de Entrega"
            value={kpis ? kpis.taxasEntrega : null}
            formatFn={formatCentavos}
            icon={<Truck className="h-5 w-5 text-blue-600" />}
            loading={kpisLoading}
            accentClassName="border-l-4 border-l-blue-500"
            footerNote="No período selecionado"
          />
          <StatCard
            title="Ticket Médio"
            value={kpis ? kpis.ticketMedio : null}
            formatFn={formatCentavos}
            icon={<DollarSign className="h-5 w-5 text-indigo-600" />}
            loading={kpisLoading}
            accentClassName="border-l-4 border-l-indigo-500"
            footerNote="Valor médio por pedido"
          />
          <StatCard
            title="Taxa de Conclusão"
            value={kpis ? kpis.taxaConclusao : null}
            formatFn={(v) => `${v.toFixed(1)}%`}
            icon={<TrendingUp className="h-5 w-5 text-teal-600" />}
            loading={kpisLoading}
            accentClassName="border-l-4 border-l-teal-500"
            footerNote="Pedidos concluídos no período"
          />
        </div>

        {/* Badges de status de pedidos */}
        <Card>
          <CardContent className="py-3 sm:py-4">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">Pedidos no Período</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
              {kpisLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-28" />
                ))
              ) : (
                Object.entries(STATUS_COLORS).map(([key, { label, bgClass }]) => {
                  const count = kpis?.pedidosPorStatus.find((p) => p.status === key)?.count ?? 0;
                  return (
                    <Badge key={key} variant="outline" className={`text-xs sm:text-sm px-2 sm:px-3 py-1 ${bgClass}`}>
                      <span className="hidden sm:inline">{label}: </span>{count}
                    </Badge>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alertas de Coleta Atrasada */}
        {alertasColeta.length > 0 && (
          <Card className="border-amber-400 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 gap-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-amber-900 dark:text-amber-200">
                ⚠️ {alertasColeta.length} {alertasColeta.length === 1 ? "pedido" : "pedidos"} com coleta atrasada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {alertasColeta
                .sort((a: any, b: any) => b.diasAtraso - a.diasAtraso)
                .slice(0, 3)
                .map((alerta: any) => (
                  <p key={alerta.pedidoId} className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>{alerta.nomeCliente}</strong> — entregue há {alerta.diasAtraso} dias
                  </p>
                ))}
              {alertasColeta.length > 3 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">+{alertasColeta.length - 3} outro(s) — veja em Estoque</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Fluxo de Caixa Semanal */}
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-base">Fluxo de Caixa Semanal</CardTitle>
            </CardHeader>
            <CardContent>
              {fluxoLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ChartContainer config={fluxoChartConfig} className="h-60 w-full">
                  <LineChart data={fluxoData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semana" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={(v) => `R$${v}`} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => `R$ ${Number(v).toFixed(2)}`} />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line type="monotone" dataKey="Receitas" stroke="var(--color-Receitas)" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Despesas" stroke="var(--color-Despesas)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Top 5 Itens */}
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Top 5 Itens Mais Alugados</CardTitle>
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : top5Data.length === 0 ? (
                <EmptyState icon={BarChart3} message="Sem dados no período" />
              ) : (
                <ChartContainer config={top5ChartConfig} className="h-64 w-full">
                  <BarChart data={top5Data} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis dataKey="nome" type="category" fontSize={11} width={100} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="quantidade" fill="var(--color-quantidade)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Distribuição de Pedidos por Status */}
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-base">Distribuição de Pedidos por Status</CardTitle>
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : pieData.length === 0 ? (
                <EmptyState icon={BarChart3} message="Sem dados no período" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => {
                        const statusKey = Object.keys(STATUS_COLORS)[index] ?? "";
                        const color = STATUS_COLORS[statusKey]?.color ?? PIE_COLORS[index % PIE_COLORS.length];
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Comparativo Mensal */}
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-base">Comparativo Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              {compLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : comparativo ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Mês Atual</p>
                      <p className="text-2xl font-bold">{formatCentavos(comparativo.mesAtual)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Mês Anterior</p>
                      <p className="text-2xl font-bold text-muted-foreground">
                        {formatCentavos(comparativo.mesAnterior)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    {comparativo.percentualVariacao >= 0 ? (
                      <ArrowUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowDown className="h-5 w-5 text-red-600" />
                    )}
                    <span
                      className={`text-lg font-semibold ${
                        comparativo.percentualVariacao >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {comparativo.percentualVariacao >= 0 ? "▲" : "▼"}{" "}
                      {Math.abs(comparativo.percentualVariacao).toFixed(1)}%
                    </span>
                    <span className="text-sm text-muted-foreground">em relação ao mês anterior</span>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Ranking de Colaboradores */}
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Ranking de Colaboradores</CardTitle>
            </CardHeader>
            <CardContent>
              {rankingLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : !ranking || ranking.length === 0 ? (
                <EmptyState icon={BarChart3} message="Sem dados no período" />
              ) : (
                <div className="space-y-3">
                  {ranking.map((colab: any, idx: number) => (
                    <Link key={colab.colaboradorId} href={`/comissoes?colabId=${colab.colaboradorId}`} className="flex items-center gap-3 rounded-lg p-1 -m-1 transition-colors hover:bg-muted/50 cursor-pointer">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {idx + 1}
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {colab.nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{colab.nome}</p>
                        <p className="text-xs text-muted-foreground">{colab.totalPedidos} pedido(s)</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{formatCentavos(colab.totalVendas)}</p>
                        <p className="text-xs text-muted-foreground">comissão: {formatCentavos(colab.totalComissao)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}


