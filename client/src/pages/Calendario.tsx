"use client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { Calendar, ChevronLeft, ChevronRight, MoreVertical, Pencil, Trash2, TrendingUp, TrendingDown, DollarSign, Truck, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/PageHeading";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { useState, useMemo, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import NovoPedidoDialog from "@/components/NovoPedidoDialog";
import { formatarResumoPedido } from "@/lib/pedidoFormat";

const statusBadge: Record<string, { label: string; className: string }> = {
  Pendente: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800" },
  Confirmado: { label: "Confirmado", className: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" },
  EntregueNaoPago: { label: "Entregue (Não Pago)", className: "bg-red-200 text-red-900 border-red-400 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800" },
  EntreguePago: { label: "Entregue (Pago)", className: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800" },
  Concluido: { label: "Concluído", className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800" },
};

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function formatCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Calendario() {
  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje);
  const [diaAberto, setDiaAberto] = useState<Date | null>(null);
  const [novoPedidoOpen, setNovoPedidoOpen] = useState(false);
  const [dataParaNovoPedido, setDataParaNovoPedido] = useState<Date | undefined>(undefined);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [diasSelecionados, setDiasSelecionados] = useState<Set<string>>(new Set());
  const utils = trpc.useUtils();

  const mes = mesAtual.getMonth() + 1; // 1-12
  const ano = mesAtual.getFullYear();

  const { data: pedidos = [], isLoading } = trpc.dashboard.getPedidosCalendario.useQuery({
    mes,
    ano,
  });

  // Query financial data for selected period
  const { dataInicio, dataFim } = useMemo(() => {
    if (diasSelecionados.size === 0) {
      return { dataInicio: null as Date | null, dataFim: null as Date | null };
    }
    const datas = Array.from(diasSelecionados).map((d) => new Date(d + "T00:00:00"));
    datas.sort((a, b) => a.getTime() - b.getTime());
    const inicio = datas[0];
    const fim = new Date(datas[datas.length - 1]);
    fim.setHours(23, 59, 59, 999);
    return { dataInicio: inicio, dataFim: fim };
  }, [diasSelecionados]);

  const { data: resumo, isLoading: resumoLoading } = trpc.dashboard.getResumoPeriodo.useQuery(
    { dataInicio: dataInicio!, dataFim: dataFim! },
    { enabled: dataInicio !== null && dataFim !== null }
  );

  const updateStatusMutation = trpc.pedidos.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado");
      utils.dashboard.getPedidosCalendario.invalidate();
      utils.dashboard.getResumoPeriodo.invalidate();
      utils.pedidos.list.invalidate();
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const { data: pedidoParaEditar } = trpc.pedidos.getById.useQuery(
    { id: editandoId! },
    { enabled: editandoId !== null }
  );

  const deleteMutation = trpc.pedidos.delete.useMutation({
    onSuccess: () => {
      toast.success("Pedido removido!");
      utils.dashboard.getPedidosCalendario.invalidate();
      utils.dashboard.getResumoPeriodo.invalidate();
    },
    onError: (error) => toast.error(`Erro ao remover pedido: ${error.message}`),
  });

  // Gerar dias do calendário
  const { diasCalendario } = useMemo(() => {
    const inicio = startOfMonth(mesAtual);
    const fim = endOfMonth(mesAtual);
    const diasCalendario = eachDayOfInterval({ start: inicio, end: fim });
    return { diasCalendario };
  }, [mesAtual]);

  // Agrupar pedidos por dia
  const pedidosPorDia = useMemo(() => {
    const mapa: Record<string, typeof pedidos> = {};
    pedidos.forEach((p) => {
      const chave = format(new Date(p.data), "yyyy-MM-dd");
      if (!mapa[chave]) mapa[chave] = [];
      mapa[chave].push(p);
    });
    return mapa;
  }, [pedidos]);

  function proximoMes() {
    setMesAtual(addMonths(mesAtual, 1));
    setDiasSelecionados(new Set());
  }

  function mesPrevio() {
    setMesAtual(subMonths(mesAtual, 1));
    setDiasSelecionados(new Set());
  }

  function voltarHoje() {
    setMesAtual(new Date());
    setDiasSelecionados(new Set());
  }

  function abrirEditarPedido(id: number) {
    setDiaAberto(null);
    setEditandoId(id);
    setNovoPedidoOpen(true);
  }

  function confirmarDeletePedido(id: number) {
    if (window.confirm("Deseja remover este pedido? O estoque será devolvido.")) {
      deleteMutation.mutate({ id });
    }
  }

  function obterEventosDia(dia: Date) {
    const chave = format(dia, "yyyy-MM-dd");
    return pedidosPorDia[chave] || [];
  }

  // Toggle day selection
  const toggleDia = useCallback((dia: Date) => {
    const chave = format(dia, "yyyy-MM-dd");
    setDiasSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(chave)) {
        novo.delete(chave);
      } else {
        novo.add(chave);
      }
      return novo;
    });
  }, []);

  // Selecionar todos os dias do mês
  function selecionarTodos() {
    const novo = new Set<string>();
    diasCalendario.forEach((dia) => novo.add(format(dia, "yyyy-MM-dd")));
    setDiasSelecionados(novo);
  }

  // Limpar seleção
  function limparSelecao() {
    setDiasSelecionados(new Set());
  }

  // Selecionar semana (segunda a domingo) contendo o dia dado
  function selecionarSemana(diaRef: Date) {
    const inicioSemana = startOfWeek(diaRef, { weekStartsOn: 0 });
    const fimSemana = endOfWeek(diaRef, { weekStartsOn: 0 });
    const diasSemana = eachDayOfInterval({ start: inicioSemana, end: fimSemana });
    const novo = new Set<string>();
    diasSemana.forEach((dia) => {
      if (isSameMonth(dia, mesAtual)) {
        novo.add(format(dia, "yyyy-MM-dd"));
      }
    });
    setDiasSelecionados(novo);
  }

  const nomesMeses = Array.from({ length: 12 }, (_, i) =>
    format(new Date(2024, i, 1), "MMMM", { locale: ptBR })
  );

  const temSelecao = diasSelecionados.size > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeading icon={<Calendar className="h-7 w-7 text-primary" />} title="Calendário">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="icon" onClick={mesPrevio}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center flex-1 sm:flex-none min-w-40">
              <p className="font-semibold text-lg capitalize">
                {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={proximoMes}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={voltarHoje} className="hidden sm:inline-flex">
              Hoje
            </Button>
          </div>
        </PageHeading>

        {/* Botões de seleção */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={selecionarTodos}>
            Selecionar Tudo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => selecionarSemana(mesAtual)}
            disabled={diasCalendario.length === 0}
          >
            Selecionar Semana
          </Button>
          {temSelecao && (
            <>
              <Button variant="outline" size="sm" onClick={limparSelecao}>
                Limpar Seleção
              </Button>
              <span className="text-sm text-muted-foreground ml-1">
                {diasSelecionados.size} dia{diasSelecionados.size > 1 ? "s" : ""} selecionado{diasSelecionados.size > 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>

        {/* Calendário Mobile - Grade 7 colunas */}
        <Card className="block md:hidden p-3 sm:p-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Cabeçalho dias da semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DIAS_SEMANA.map((dia) => (
                  <div key={dia} className="text-center font-semibold text-[10px] sm:text-xs text-muted-foreground py-1">
                    {dia}
                  </div>
                ))}
              </div>

              {/* Grade de dias */}
              <div className="grid grid-cols-7 gap-1">
                {/* Dias vazios antes do primeiro dia do mês */}
                {Array.from({ length: diasCalendario[0]?.getDay() || 0 }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-16 sm:min-h-20" />
                ))}

                {/* Dias do mês */}
                {diasCalendario.map((dia) => {
                  const eventos = obterEventosDia(dia);
                  const ehHoje = isToday(dia);
                  const chave = format(dia, "yyyy-MM-dd");
                  const selecionado = diasSelecionados.has(chave);

                  return (
                    <div
                      key={chave}
                      className={`min-h-16 sm:min-h-20 border rounded-lg overflow-hidden flex flex-col transition-colors ${
                        selecionado
                          ? "border-primary bg-primary/20 ring-1 ring-primary"
                          : ehHoje
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background"
                      }`}
                    >
                      <button
                        onClick={() => toggleDia(dia)}
                        onDoubleClick={() => setDiaAberto(dia)}
                        className="flex-1 p-1 sm:p-2 text-left"
                      >
                        <div className="font-semibold text-[10px] sm:text-xs mb-0.5 flex items-center justify-between">
                          <span>{dia.getDate()}</span>
                          {eventos.length > 0 && (
                            <span className="text-[8px] bg-primary/20 rounded px-0.5">{eventos.length}</span>
                          )}
                        </div>
                        <div className="space-y-0.5 flex-1 overflow-hidden">
                          {eventos.slice(0, 2).map((evento) => {
                            const badge = statusBadge[evento.status] || {
                              label: evento.status,
                              className: "",
                            };
                            const [bgColor, textColor] = badge.className.split(" ").slice(0, 2);
                            return (
                              <div
                                key={evento.id}
                                className={`text-[8px] sm:text-xs rounded px-1 py-0.5 truncate ${bgColor} ${textColor}`}
                              >
                                {formatarResumoPedido(evento).substring(0, 12)}
                              </div>
                            );
                          })}
                          {eventos.length > 2 && (
                            <p className="text-[8px] sm:text-xs text-muted-foreground font-medium">
                              +{eventos.length - 2}
                            </p>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Toque para selecionar • Toque duplo para ver pedidos
              </p>
            </>
          )}
        </Card>

        {/* Calendário Desktop - Grade 7 colunas */}
        <Card className="hidden md:block p-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Cabeçalho dias da semana */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {DIAS_SEMANA.map((dia) => (
                  <div key={dia} className="text-center font-semibold text-sm text-muted-foreground py-2">
                    {dia}
                  </div>
                ))}
              </div>

              {/* Grade de dias */}
              <div className="grid grid-cols-7 gap-2">
                {/* Dias vazios antes do primeiro dia do mês */}
                {Array.from({ length: diasCalendario[0]?.getDay() || 0 }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-20" />
                ))}

                {/* Dias do mês */}
                {diasCalendario.map((dia) => {
                  const eventos = obterEventosDia(dia);
                  const ehHoje = isToday(dia);
                  const ehMesAtual = isSameMonth(dia, mesAtual);
                  const chave = format(dia, "yyyy-MM-dd");
                  const selecionado = diasSelecionados.has(chave);

                  return (
                    <div
                      key={chave}
                      className={`min-h-20 border rounded-lg overflow-hidden flex flex-col transition-colors ${
                        selecionado
                          ? "border-primary bg-primary/20 ring-2 ring-primary"
                          : ehHoje
                            ? "border-primary bg-primary/10"
                            : ehMesAtual
                              ? "border-border bg-background"
                              : "border-border/50 bg-muted/30 opacity-50"
                      }`}
                    >
                      <button
                        onClick={() => toggleDia(dia)}
                        onDoubleClick={() => setDiaAberto(dia)}
                        className="flex-1 p-2 text-left hover:bg-muted/30"
                      >
                        <div className="font-semibold text-sm mb-1 flex items-center justify-between">
                          <span>{dia.getDate()}</span>
                          {eventos.length > 0 && (
                            <span className="text-[10px] bg-primary/20 rounded px-1 font-normal">{eventos.length}</span>
                          )}
                        </div>
                        <div className="space-y-1 flex-1 overflow-hidden">
                          {eventos.slice(0, 3).map((evento) => {
                            const badge = statusBadge[evento.status] || {
                              label: evento.status,
                              className: "",
                            };
                            return (
                              <div
                                key={evento.id}
                                className="text-xs bg-background border border-border rounded px-1 py-0.5 truncate"
                              >
                                <p className="truncate font-medium">{formatarResumoPedido(evento)}</p>
                                <Badge
                                  variant="outline"
                                  className={`text-xs h-5 ${badge.className}`}
                                >
                                  {badge.label}
                                </Badge>
                              </div>
                            );
                          })}
                          {eventos.length > 3 && (
                            <p className="text-xs text-muted-foreground font-medium">
                              +{eventos.length - 3} mais
                            </p>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Clique para selecionar dias • Duplo clique para ver os pedidos do dia
              </p>
            </>
          )}
        </Card>

        {/* Dashboard Financeiro do Período Selecionado */}
        {temSelecao && dataInicio && dataFim && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Resumo Financeiro — {diasSelecionados.size} dia{diasSelecionados.size > 1 ? "s" : ""}
                <span className="text-sm font-normal text-muted-foreground">
                  ({format(dataInicio, "dd/MM/yyyy")} a {format(dataFim, "dd/MM/yyyy")})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resumoLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : resumo ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {/* Faturamento */}
                    <div className="border rounded-lg p-3 border-l-4 border-l-green-500">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-muted-foreground">Faturamento</span>
                      </div>
                      <p className="text-lg font-bold text-green-600">{formatCentavos(resumo.faturamento)}</p>
                    </div>

                    {/* Taxas de Entrega */}
                    <div className="border rounded-lg p-3 border-l-4 border-l-blue-500">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-medium text-muted-foreground">Taxas de Entrega</span>
                      </div>
                      <p className="text-lg font-bold text-blue-600">{formatCentavos(resumo.taxasEntrega)}</p>
                    </div>

                    {/* Despesas Normais */}
                    <div className="border rounded-lg p-3 border-l-4 border-l-red-500">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-medium text-muted-foreground">Despesas Normais</span>
                      </div>
                      <p className="text-lg font-bold text-red-600">{formatCentavos(resumo.despesasNormais)}</p>
                      <p className="text-[10px] text-muted-foreground">Gasolina, etc. (manuais)</p>
                    </div>

                    {/* Comissões */}
                    <div className="border rounded-lg p-3 border-l-4 border-l-orange-500">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingDown className="h-4 w-4 text-orange-600" />
                        <span className="text-xs font-medium text-muted-foreground">Comissões</span>
                      </div>
                      <p className="text-lg font-bold text-orange-600">{formatCentavos(resumo.comissoes)}</p>
                      <p className="text-[10px] text-muted-foreground">Aluguéis concluídos</p>
                    </div>

                    {/* Comissões Estimadas */}
                    <div className="border rounded-lg p-3 border-l-4 border-l-amber-400 bg-amber-50/30 dark:bg-amber-950/10">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-medium text-muted-foreground">Comissões Estimadas</span>
                      </div>
                      <p className="text-lg font-bold text-amber-600">{formatCentavos(resumo.comissoesEstimadas)}</p>
                      <p className="text-[10px] text-muted-foreground">Aluguéis pendentes</p>
                    </div>

                    {/* Saldo */}
                    <div className={`border rounded-lg p-3 border-l-4 ${resumo.saldo >= 0 ? "border-l-green-500" : "border-l-red-500"}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-xs font-medium text-muted-foreground">Saldo</span>
                      </div>
                      <p className={`text-lg font-bold ${resumo.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCentavos(resumo.saldo)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Fat. + taxas - desp. - comiss.</p>
                    </div>

                    {/* Total Pedidos */}
                    <div className="border rounded-lg p-3 border-l-4 border-l-indigo-500">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                        <span className="text-xs font-medium text-muted-foreground">Total Pedidos</span>
                      </div>
                      <p className="text-lg font-bold text-indigo-600">{resumo.totalPedidos}</p>
                      <p className="text-[10px] text-muted-foreground">{resumo.pedidosConcluidos} concluídos, {resumo.pedidosPendentes} pendentes</p>
                    </div>

                    {/* Saldo Projetado (com comissões estimadas) */}
                    <div className="border rounded-lg p-3 border-l-4 border-l-purple-500 bg-purple-50/30 dark:bg-purple-950/10">
                      <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                        <span className="text-xs font-medium text-muted-foreground">Saldo Projetado</span>
                      </div>
                      <p className={`text-lg font-bold ${resumo.saldo - resumo.comissoesEstimadas >= 0 ? "text-purple-600" : "text-red-600"}`}>
                        {formatCentavos(resumo.saldo - resumo.comissoesEstimadas)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Saldo - comissões estimadas</p>
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Legenda */}
        <Card className="p-4">
          <p className="text-sm font-semibold mb-3">Legenda de Status</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(statusBadge).map(([key, { label, className }]) => (
              <div key={key} className="flex items-center gap-2">
                <Badge variant="outline" className={`text-xs ${className}`}>
                  {label}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Dialog - Pedidos do dia */}
      <Dialog open={!!diaAberto} onOpenChange={(open) => !open && setDiaAberto(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {diaAberto ? format(diaAberto, "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {diaAberto && obterEventosDia(diaAberto).length > 0 ? (
              obterEventosDia(diaAberto).map((pedido) => {
                const badge = statusBadge[pedido.status] || {
                  label: pedido.status,
                  className: "",
                };
                const [bgColor] = badge.className.split(" ");

                return (
                  <div key={pedido.id} className={`border rounded-lg p-3 relative ${badge.className}`}>
                    <div className="absolute top-2 right-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => abrirEditarPedido(pedido.id)}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Mudar Status</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuRadioGroup
                                value={pedido.status}
                                onValueChange={(novoStatus) =>
                                  updateStatusMutation.mutate({ id: pedido.id, status: novoStatus as any })
                                }
                              >
                                <DropdownMenuRadioItem value="Pendente">Pendente</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="Confirmado">Confirmado</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="EntregueNaoPago">Entregue (Não Pago)</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="EntreguePago">Entregue (Pago)</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="Concluido">Concluído</DropdownMenuRadioItem>
                              </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuItem onClick={() => confirmarDeletePedido(pedido.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Apagar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="pr-8">
                      <p className="font-semibold text-sm">{formatarResumoPedido(pedido)}</p>
                      <p className="text-xs text-muted-foreground mb-2">Valor: R$ {(pedido.valorTotal / 100).toFixed(2)}</p>
                      {(pedido.composicaoItens?.length > 0 || pedido.composicaoKits?.length > 0) && (
                        <div className="rounded-md bg-white/60 dark:bg-black/20 p-2 space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">Composição</p>
                          {pedido.composicaoItens?.map((item: any, idx: number) => (
                            <div key={`item-${idx}`} className="flex justify-between text-xs">
                              <span>{item.nome}</span>
                              <span className="font-medium">{item.quantidade}x</span>
                            </div>
                          ))}
                          {pedido.composicaoKits?.map((kit: any, idx: number) => (
                            <div key={`kit-${idx}`} className="flex justify-between text-xs">
                              <span>{kit.nome}</span>
                              <span className="font-medium">{kit.quantidade}x</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState icon={Calendar} message="Nenhum pedido neste dia." />
            )}

            {diaAberto && (
              <Button
                onClick={() => {
                  setDataParaNovoPedido(diaAberto);
                  setDiaAberto(null);
                  setNovoPedidoOpen(true);
                }}
                className="w-full"
              >
                Novo Pedido nesse dia
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog - Novo Pedido / Editar Pedido */}
      <NovoPedidoDialog
        open={novoPedidoOpen}
        onOpenChange={(open) => {
          setNovoPedidoOpen(open);
          if (!open) setEditandoId(null);
        }}
        dataInicial={dataParaNovoPedido}
        pedidoParaEditar={editandoId !== null && pedidoParaEditar ? {
          id: pedidoParaEditar.id,
          nomeCliente: pedidoParaEditar.nomeCliente,
          colaboradorId: pedidoParaEditar.colaboradorId,
          data: pedidoParaEditar.data,
          ruaEntrega: pedidoParaEditar.ruaEntrega,
          bairroEntrega: pedidoParaEditar.bairroEntrega,
          numeroEntrega: pedidoParaEditar.numeroEntrega,
          valorTotal: pedidoParaEditar.valorTotal,
          valorTaxaEntrega: pedidoParaEditar.valorTaxaEntrega,
          observacoes: pedidoParaEditar.observacoes,
          itens: pedidoParaEditar.itens,
          kits: pedidoParaEditar.kits,
        } : null}
      />
    </DashboardLayout>
  );
}
