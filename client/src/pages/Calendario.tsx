"use client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
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
} from "date-fns";
import { ptBR } from "date-fns/locale";
import NovoPedidoDialog from "@/components/NovoPedidoDialog";

const statusBadge: Record<string, { label: string; className: string }> = {
  Pendente: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  Confirmado: { label: "Confirmado", className: "bg-blue-100 text-blue-800 border-blue-300" },
  "Em Preparacao": { label: "Em Preparação", className: "bg-purple-100 text-purple-800 border-purple-300" },
  Entregue: { label: "Entregue", className: "bg-orange-100 text-orange-800 border-orange-300" },
  Concluido: { label: "Concluído", className: "bg-green-100 text-green-800 border-green-300" },
};

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export default function Calendario() {
  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje);
  const [diaAberto, setDiaAberto] = useState<Date | null>(null);
  const [novoPedidoOpen, setNovoPedidoOpen] = useState(false);
  const [dataParaNovoPedido, setDataParaNovoPedido] = useState<Date | undefined>(undefined);
  const utils = trpc.useUtils();

  const mes = mesAtual.getMonth() + 1; // 1-12
  const ano = mesAtual.getFullYear();

  const { data: pedidos = [], isLoading } = trpc.dashboard.getPedidosCalendario.useQuery({
    mes,
    ano,
  });

  const updateStatusMutation = trpc.pedidos.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado");
      utils.dashboard.getPedidosCalendario.invalidate();
      utils.pedidos.list.invalidate();
    },
    onError: () => toast.error("Erro ao atualizar status"),
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
      const chave = format(new Date(p.dataEvento), "yyyy-MM-dd");
      if (!mapa[chave]) mapa[chave] = [];
      mapa[chave].push(p);
    });
    return mapa;
  }, [pedidos]);

  function proximoMes() {
    setMesAtual(addMonths(mesAtual, 1));
  }

  function mesPrevio() {
    setMesAtual(subMonths(mesAtual, 1));
  }

  function voltarHoje() {
    setMesAtual(new Date());
  }

  function obterEventosDia(dia: Date) {
    const chave = format(dia, "yyyy-MM-dd");
    return pedidosPorDia[chave] || [];
  }

  const nomesMeses = Array.from({ length: 12 }, (_, i) =>
    format(new Date(2024, i, 1), "MMMM", { locale: ptBR })
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Calendário</h1>
          </div>
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
        </div>

        {/* Calendário Mobile - Grade 7 colunas */}
        <Card className="block md:hidden p-3 sm:p-4">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando...</p>
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

                  return (
                    <button
                      key={format(dia, "yyyy-MM-dd")}
                      onClick={() => setDiaAberto(dia)}
                      className={`min-h-16 sm:min-h-20 border rounded-lg p-1 sm:p-2 overflow-hidden flex flex-col text-left transition-colors hover:bg-muted/50 ${
                        ehHoje
                          ? "border-blue-500 bg-blue-50"
                          : "border-border bg-background"
                      }`}
                    >
                      {/* Número do dia */}
                      <div className="font-semibold text-[10px] sm:text-xs mb-0.5">{dia.getDate()}</div>

                      {/* Chips de eventos */}
                      <div className="space-y-0.5 flex-1 overflow-hidden">
                        {eventos.slice(0, 2).map((evento) => {
                          const badge = statusBadge[evento.status] || {
                            label: evento.status,
                            className: "",
                          };
                          const nomeExibicao = evento.nomeCliente || `Pedido #${evento.id}`;
                          const [bgColor, textColor] = badge.className.split(" ").slice(0, 2);
                          return (
                            <div
                              key={evento.id}
                              className={`text-[8px] sm:text-xs rounded px-1 py-0.5 truncate ${bgColor} ${textColor}`}
                            >
                              {nomeExibicao.substring(0, 10)}
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
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* Calendário Desktop - Grade 7 colunas */}
        <Card className="hidden md:block p-6">
          {isLoading ? (
            <p className="text-center py-12 text-muted-foreground">Carregando...</p>
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

                  return (
                    <button
                      key={format(dia, "yyyy-MM-dd")}
                      onClick={() => setDiaAberto(dia)}
                      className={`min-h-20 border rounded-lg p-2 overflow-hidden flex flex-col text-left transition-colors hover:bg-muted/50 ${
                        ehHoje
                          ? "border-blue-500 bg-blue-50"
                          : ehMesAtual
                            ? "border-border bg-background"
                            : "border-border/50 bg-muted/30 opacity-50"
                      }`}
                    >
                      {/* Número do dia */}
                      <div className="font-semibold text-sm mb-1">{dia.getDate()}</div>

                      {/* Eventos */}
                      <div className="space-y-1 flex-1 overflow-hidden">
                        {eventos.slice(0, 3).map((evento) => {
                          const badge = statusBadge[evento.status] || {
                            label: evento.status,
                            className: "",
                          };
                          const nomeExibicao = evento.nomeCliente || `Pedido #${evento.id}`;
                          return (
                            <div
                              key={evento.id}
                              className="text-xs bg-white border border-border rounded px-1 py-0.5 truncate"
                            >
                              <p className="truncate font-medium">{nomeExibicao}</p>
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
                  );
                })}
              </div>
            </>
          )}
        </Card>

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
                    {/* Badge de status no canto - removido, agora o fundo é colorido */}

                    <div className="pr-4">
                      <p className="font-semibold text-sm">{pedido.nomeCliente}</p>
                      <p className="text-xs text-muted-foreground mb-2">Valor: R$ {(pedido.valorTotal / 100).toFixed(2)}</p>

                      <div className="space-y-2">
                        <label className="text-xs font-medium">Status:</label>
                        <Select
                          value={pedido.status}
                          onValueChange={(novoStatus) => {
                            updateStatusMutation.mutate({
                              id: pedido.id,
                              status: novoStatus as any,
                            });
                          }}
                        >
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pendente">Pendente</SelectItem>
                            <SelectItem value="Confirmado">Confirmado</SelectItem>
                            <SelectItem value="Em Preparacao">Em Preparação</SelectItem>
                            <SelectItem value="Entregue">Entregue</SelectItem>
                            <SelectItem value="Concluido">Concluído</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center py-4 text-muted-foreground text-sm">Nenhum pedido neste dia</p>
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

      {/* Dialog - Novo Pedido */}
      <NovoPedidoDialog
        open={novoPedidoOpen}
        onOpenChange={setNovoPedidoOpen}
        dataInicial={dataParaNovoPedido}
      />
    </DashboardLayout>
  );
}
