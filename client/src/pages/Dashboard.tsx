import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { formatarResumoPedido } from "@/lib/pedidoFormat";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Wallet,
  AlertCircle,
  Users,
  Package,
  Clock,
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
  const v = Number.isFinite(centavos) ? centavos : 0;
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Componente de Seção ──────────────────────────────────────────────────────

function SectionTitle({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold leading-tight">{title}</h2>
        {description && <p className="text-xs text-muted-foreground leading-tight">{description}</p>}
      </div>
    </div>
  );
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

  const saldoProjetado = (kpis?.saldo ?? 0) - (kpis?.comissoesEstimadas ?? 0);

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

        {/* Alertas de Coleta Atrasada */}
        {alertasColeta.length > 0 && (
          <Card className="border-amber-400 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 gap-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <AlertCircle className="h-5 w-5" />
                {alertasColeta.length} {alertasColeta.length === 1 ? "pedido com coleta atrasada" : "pedidos com coleta atrasada"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {alertasColeta
                .sort((a: any, b: any) => b.diasAtraso - a.diasAtraso)
                .slice(0, 3)
                .map((alerta: any) => (
                  <p key={alerta.pedidoId} className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>{formatarResumoPedido(alerta)}</strong> — entregue há {alerta.diasAtraso} dias
                  </p>
                ))}
              {alertasColeta.length > 3 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">+{alertasColeta.length - 3} outro(s) — veja em Estoque</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════
            SEÇÃO 1: RESUMO GERAL
            Visão rápida do mês: saldo, faturamento total e ticket médio
        ═══════════════════════════════════════════════════════════════════════════ */}
        <div>
          <SectionTitle
            icon={<Wallet className="h-4 w-4" />}
            title="Resumo Geral"
            description="Visão rápida da saúde financeira do mês"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard
              title="Saldo do Mês"
              value={kpis ? kpis.saldo : null}
              formatFn={formatCentavos}
              icon={<DollarSign className="h-5 w-5" />}
              loading={kpisLoading}
              accentClassName={`border-l-4 ${kpis && kpis.saldo >= 0 ? "border-l-green-500" : "border-l-red-500"}`}
              valueClassName={kpis && kpis.saldo < 0 ? "text-red-600" : "text-green-600"}
              footerNote="Receitas + taxas - despesas - comissões"
            />
            <StatCard
              title="Saldo Projetado"
              value={kpis ? saldoProjetado : null}
              formatFn={formatCentavos}
              icon={<Clock className="h-5 w-5 text-purple-600" />}
              loading={kpisLoading}
              accentClassName="border-l-4 border-l-purple-500"
              valueClassName={saldoProjetado < 0 ? "text-red-600" : "text-purple-600"}
              footerNote="Saldo menos comissões estimadas (futuras)"
            />
            <StatCard
              title="Ticket Médio"
              value={kpis ? kpis.ticketMedio : null}
              formatFn={formatCentavos}
              icon={<DollarSign className="h-5 w-5 text-indigo-600" />}
              loading={kpisLoading}
              accentClassName="border-l-4 border-l-indigo-500"
              footerNote="Valor médio por pedido no período"
            />
          </div>
        </div>

        <Separator />

        {/* ═══════════════════════════════════════════════════════════════════════════
            SEÇÃO 2: RECEITAS
            Tudo que entra: faturamento, taxas de entrega
        ═══════════════════════════════════════════════════════════════════════════ */}
        <div>
          <SectionTitle
            icon={<TrendingUp className="h-4 w-4" />}
            title="Receitas"
            description="Tudo que entra no caixa — aluguéis e taxas de entrega"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
              footerNote="Aluguéis já realizados (não conta o restante do mês)"
            />
            <StatCard
              title="Taxas de Entrega"
              value={kpis ? kpis.taxasEntrega : null}
              formatFn={formatCentavos}
              icon={<Truck className="h-5 w-5 text-blue-600" />}
              loading={kpisLoading}
              accentClassName="border-l-4 border-l-blue-500"
              footerNote="Taxas cobradas dos clientes no período"
            />
          </div>
        </div>

        <Separator />

        {/* ═══════════════════════════════════════════════════════════════════════════
            SEÇÃO 3: DESPESAS
            Tudo que sai: despesas normais (manuais), comissões (concluídas), comissões estimadas (pendentes)
        ═══════════════════════════════════════════════════════════════════════════ */}
        <div>
          <SectionTitle
            icon={<TrendingDown className="h-4 w-4" />}
            title="Despesas"
            description="Tudo que sai do caixa — despesas manuais e comissões"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard
              title="Despesas Normais"
              value={kpis ? kpis.totalDespesasNormais : null}
              formatFn={formatCentavos}
              icon={<TrendingDown className="h-5 w-5 text-red-600" />}
              loading={kpisLoading}
              accentClassName="border-l-4 border-l-red-500"
              valueClassName="text-red-600"
              footerNote={kpis ? `Até hoje: ${formatCentavos(kpis.totalDespesasNormaisAteHoje)}` : "Gasolina, oficina, etc. (lançadas manualmente)"}
            />
            <StatCard
              title="Comissões Pagas"
              value={kpis ? kpis.totalComissoes : null}
              formatFn={formatCentavos}
              icon={<TrendingDown className="h-5 w-5 text-orange-600" />}
              loading={kpisLoading}
              accentClassName="border-l-4 border-l-orange-500"
              valueClassName="text-red-600"
              footerNote={kpis ? `Até hoje: ${formatCentavos(kpis.totalComissoesAteHoje)}` : "Comissões de aluguéis já concluídos"}
            />
            <StatCard
              title="Comissões Estimadas"
              value={kpis ? kpis.comissoesEstimadas : null}
              formatFn={formatCentavos}
              icon={<Clock className="h-5 w-5 text-amber-600" />}
              loading={kpisLoading}
              accentClassName="border-l-4 border-l-amber-400"
              valueClassName="text-amber-600"
              footerNote="Aluguéis não concluídos — ainda não descontadas do saldo"
            />
          </div>
        </div>

        <Separator />

        {/* ═══════════════════════════════════════════════════════════════════════════
            SEÇÃO 4: PEDIDOS
            Status dos pedidos no período
        ═══════════════════════════════════════════════════════════════════════════ */}
        <div>
          <SectionTitle
            icon={<Package className="h-4 w-4" />}
            title="Pedidos no Período"
            description="Distribuição dos pedidos por status"
          />
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">
                  Taxa de Conclusão:{" "}
                  <span className="font-bold text-teal-600">
                    {kpis ? `${kpis.taxaConclusao.toFixed(1)}%` : "—"}
                  </span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {kpis?.totalPedidosNoPeriodo ?? 0} pedido(s) no total
                </span>
              </div>
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
        </div>

        <Separator />

        {/* ═══════════════════════════════════════════════════════════════════════════
            SEÇÃO 5: GRÁFICOS E ANÁLISES
            Fluxo de caixa, top itens, distribuição, comparativo, ranking
        ═══════════════════════════════════════════════════════════════════════════ */}
        <div>
          <SectionTitle
            icon={<BarChart3 className="h-4 w-4" />}
            title="Análises e Gráficos"
            description="Visualizações do período selecionado"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Fluxo de Caixa Semanal */}
            <Card className="gap-2">
              <CardHeader>
                <CardTitle className="text-base">Fluxo de Caixa Semanal</CardTitle>
                <CardDescription className="text-xs">Receitas vs despesas por semana do mês</CardDescription>
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
                <CardDescription className="text-xs">Itens com maior volume de aluguel no período</CardDescription>
              </CardHeader>
              <CardContent>
                {kpisLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : top5Data.length === 0 ? (
                  <EmptyState icon={BarChart3} message="Sem dados no período" />
                ) : (
                  <ChartContainer config={top5ChartConfig} className="h-60 w-full">
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
                <CardDescription className="text-xs">Quantos pedidos estão em cada status</CardDescription>
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
                <CardDescription className="text-xs">Faturamento deste mês vs. mês anterior</CardDescription>
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
            <Card className="gap-2 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Ranking de Colaboradores
                </CardTitle>
                <CardDescription className="text-xs">Vendas e comissões por colaborador no período — clique para ver detalhes</CardDescription>
              </CardHeader>
              <CardContent>
                {rankingLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : !ranking || ranking.length === 0 ? (
                  <EmptyState icon={BarChart3} message="Sem dados no período" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ranking.map((colab: any, idx: number) => (
                      <Link key={colab.colaboradorId} href={`/comissoes?colabId=${colab.colaboradorId}`} className="flex items-center gap-3 rounded-lg p-2 -m-1 transition-colors hover:bg-muted/50 cursor-pointer border border-border/50">
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
      </div>
    </DashboardLayout>
  );
}
