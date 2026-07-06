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
  Pendente: { label: "Pendente", color: "#eab308", bgClass: "bg-yellow-100 text-yellow-800" },
  Confirmado: { label: "Confirmado", color: "#3b82f6", bgClass: "bg-blue-100 text-blue-800" },
  EntregueNaoPago: { label: "Entregue (Não Pago)", color: "#dc2626", bgClass: "bg-red-200 text-red-900" },
  EntreguePago: { label: "Entregue (Pago)", color: "#f87171", bgClass: "bg-red-100 text-red-700" },
  Concluido: { label: "Concluído", color: "#22c55e", bgClass: "bg-green-100 text-green-800" },
};

const PIE_COLORS = ["#eab308", "#3b82f6", "#dc2626", "#f87171", "#22c55e"];

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 sm:h-7 w-6 sm:w-7 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
          </div>
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
        </div>

        {/* Cards de KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <KPICard
            title="Faturamento do Mês"
            value={kpis ? formatCentavos(kpis.faturamentoTotal) : null}
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
            loading={kpisLoading}
            colorClass="border-l-4 border-l-green-500"
          />
          <KPICard
            title="Saldo do Mês"
            value={kpis ? formatCentavos(kpis.saldo) : null}
            icon={<DollarSign className="h-5 w-5" />}
            loading={kpisLoading}
            colorClass={`border-l-4 ${kpis && kpis.saldo >= 0 ? "border-l-green-500" : "border-l-red-500"}`}
            valueClass={kpis && kpis.saldo < 0 ? "text-red-600" : "text-green-600"}
          />
          <KPICard
            title="Total de Despesas"
            value={kpis ? formatCentavos(kpis.totalDespesas) : null}
            icon={<TrendingDown className="h-5 w-5 text-red-600" />}
            loading={kpisLoading}
            colorClass="border-l-4 border-l-red-500"
            valueClass="text-red-600"
          />
          <KPICard
            title="Taxas de Entrega"
            value={kpis ? formatCentavos(kpis.taxasEntrega) : null}
            icon={<Truck className="h-5 w-5 text-blue-600" />}
            loading={kpisLoading}
            colorClass="border-l-4 border-l-blue-500"
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

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Fluxo de Caixa Semanal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fluxo de Caixa Semanal</CardTitle>
            </CardHeader>
            <CardContent>
              {fluxoLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={fluxoData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semana" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Receitas" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top 5 Itens */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Top 5 Itens Mais Alugados</CardTitle>
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : top5Data.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={top5Data} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis dataKey="nome" type="category" fontSize={11} width={100} />
                    <Tooltip />
                    <Bar dataKey="quantidade" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Distribuição de Pedidos por Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição de Pedidos por Status</CardTitle>
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : pieData.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">Sem dados no período</p>
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
          <Card>
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
        </div>
      </div>
    </DashboardLayout>
  );
}

// ─── Componente auxiliar ───────────────────────────────────────────────────────

function KPICard({
  title,
  value,
  icon,
  loading,
  colorClass,
  valueClass,
}: {
  title: string;
  value: string | null;
  icon: React.ReactNode;
  loading: boolean;
  colorClass?: string;
  valueClass?: string;
}) {
  return (
    <Card className={colorClass}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon}
        </div>
        {loading ? (
          <Skeleton className="h-8 w-32 mt-2" />
        ) : (
          <p className={`text-2xl font-bold mt-2 ${valueClass ?? ""}`}>{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
