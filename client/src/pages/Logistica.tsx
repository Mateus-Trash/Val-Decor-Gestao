import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { Truck, Plus, Trash2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Tipos e constantes ───────────────────────────────────────────────────────

type StatusEntrega = "agendado" | "em_rota" | "concluido" | "cancelado";
type TipoEntrega = "entrega" | "coleta";

const statusConfig: Record<StatusEntrega, { label: string; className: string }> = {
  agendado: { label: "Agendado", className: "bg-blue-100 text-blue-800 border-blue-300" },
  em_rota: { label: "Em Rota", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  concluido: { label: "Concluído", className: "bg-green-100 text-green-800 border-green-300" },
  cancelado: { label: "Cancelado", className: "bg-red-100 text-red-800 border-red-300" },
};

const agendamentoSchema = z.object({
  pedidoId: z.string().min(1, "Selecione um pedido"),
  colaboradorId: z.string().optional(),
  tipo: z.enum(["entrega", "coleta"]),
  dataAgendada: z.string().min(1, "Data é obrigatória"),
  observacoes: z.string().optional(),
});

type AgendamentoForm = z.infer<typeof agendamentoSchema>;

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Logistica() {
  const [tabAtiva, setTabAtiva] = useState<TipoEntrega>("entrega");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: entregas = [], isLoading } = trpc.entregas.list.useQuery();
  const { data: pedidosList = [] } = trpc.pedidos.list.useQuery();
  const { data: colaboradoresList = [] } = trpc.colaboradores.list.useQuery();

  const createMutation = trpc.entregas.create.useMutation({
    onSuccess: () => {
      toast.success("Agendamento criado!");
      utils.entregas.list.invalidate();
      fecharDialog();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const updateStatusMutation = trpc.entregas.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      utils.entregas.list.invalidate();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const deleteMutation = trpc.entregas.delete.useMutation({
    onSuccess: () => {
      toast.success("Agendamento removido!");
      utils.entregas.list.invalidate();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<AgendamentoForm>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: { tipo: "entrega" },
  });

  // Filtrar por tab e status
  const listaFiltrada = useMemo(() => {
    return entregas.filter((e) => {
      const tipoOk = e.tipo === tabAtiva;
      const statusOk = filtroStatus === "todos" || e.status === filtroStatus;
      return tipoOk && statusOk;
    });
  }, [entregas, tabAtiva, filtroStatus]);

  function fecharDialog() {
    setDialogOpen(false);
    reset({ tipo: "entrega" });
  }

  function confirmarDelete(id: number) {
    if (window.confirm("Deseja remover este agendamento?")) {
      deleteMutation.mutate({ id });
    }
  }

  function onSubmit(data: AgendamentoForm) {
    createMutation.mutate({
      pedidoId: Number(data.pedidoId),
      colaboradorId: data.colaboradorId ? Number(data.colaboradorId) : undefined,
      tipo: data.tipo,
      dataAgendada: new Date(data.dataAgendada + "T12:00:00"),
      observacoes: data.observacoes || undefined,
    });
  }

  function formatData(d: Date | null | undefined) {
    if (!d) return "—";
    return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR });
  }

  function nomePedido(pedidoId: number, nomeCliente: string | null | undefined) {
    return nomeCliente ? `#${pedidoId} — ${nomeCliente}` : `#${pedidoId}`;
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <Truck className="h-6 sm:h-7 w-6 sm:w-7 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Logística</h1>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Agendar Entrega/Coleta
          </Button>
        </div>

        {/* Tabs + Filtro */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <Tabs value={tabAtiva} onValueChange={(v) => setTabAtiva(v as TipoEntrega)}>
            <TabsList>
              <TabsTrigger value="entrega">Entregas</TabsTrigger>
              <TabsTrigger value="coleta">Coletas</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="em_rota">Em Rota</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela Desktop */}
        <Card className="hidden sm:block">
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : listaFiltrada.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Nenhum agendamento encontrado.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Data Agendada</TableHead>
                      <TableHead>Data Realizada</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listaFiltrada.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono font-medium">
                          {nomePedido(e.pedidoId, e.nomeCliente)}
                        </TableCell>
                        <TableCell>{e.nomeColaborador ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatData(e.dataAgendada)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatData(e.dataRealizada)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={e.status}
                            onValueChange={(v) =>
                              updateStatusMutation.mutate({
                                id: e.id,
                                status: v as StatusEntrega,
                              })
                            }
                          >
                            <SelectTrigger
                              className={`w-36 h-7 text-xs border ${statusConfig[e.status as StatusEntrega]?.className ?? ""}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusConfig).map(([key, { label }]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                          {e.observacoes ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => confirmarDelete(e.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cards Mobile */}
        <div className="block sm:hidden space-y-3">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando...</p>
          ) : listaFiltrada.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum agendamento encontrado.</p>
          ) : (
            listaFiltrada.map((e) => {
              const statusInfo = statusConfig[e.status as StatusEntrega] ?? { label: e.status, className: "" };
              return (
                <Card key={e.id} className="p-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-semibold">{nomePedido(e.pedidoId, e.nomeCliente)}</p>
                        <p className="text-xs text-muted-foreground">{e.nomeColaborador || "—"}</p>
                      </div>
                      <Select
                        value={e.status}
                        onValueChange={(v) =>
                          updateStatusMutation.mutate({
                            id: e.id,
                            status: v as StatusEntrega,
                          })
                        }
                      >
                        <SelectTrigger className={`w-28 h-7 text-xs border ${statusInfo.className}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="font-medium">Agendada:</span> {formatData(e.dataAgendada)}</div>
                      <div><span className="font-medium">Realizada:</span> {formatData(e.dataRealizada)}</div>
                    </div>
                    {e.observacoes && (
                      <p className="text-xs text-muted-foreground border-t pt-2">{e.observacoes}</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="destructive" onClick={() => confirmarDelete(e.id)} className="flex-1 h-8 text-xs">
                        Deletar
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Dialog de agendamento */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) fecharDialog(); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agendar Entrega/Coleta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Pedido */}
            <div className="space-y-1">
              <Label>Pedido *</Label>
              <Controller
                name="pedidoId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um pedido" />
                    </SelectTrigger>
                    <SelectContent>
                      {pedidosList.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          #{p.id} — {p.nomeCliente ?? "Sem cliente"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.pedidoId && (
                <p className="text-sm text-destructive">{errors.pedidoId.message}</p>
              )}
            </div>

            {/* Colaborador */}
            <div className="space-y-1">
              <Label>Colaborador</Label>
              <Controller
                name="colaboradorId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {colaboradoresList.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Controller
                name="tipo"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex flex-col sm:flex-row gap-4 sm:gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="entrega" id="tipo-entrega" />
                      <Label htmlFor="tipo-entrega" className="cursor-pointer">Entrega</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="coleta" id="tipo-coleta" />
                      <Label htmlFor="tipo-coleta" className="cursor-pointer">Coleta</Label>
                    </div>
                  </RadioGroup>
                )}
              />
            </div>

            {/* Data agendada */}
            <div className="space-y-1">
              <Label htmlFor="dataAgendada">Data Agendada *</Label>
              <Input
                id="dataAgendada"
                type="date"
                {...register("dataAgendada")}
              />
              {errors.dataAgendada && (
                <p className="text-sm text-destructive">{errors.dataAgendada.message}</p>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-1">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                {...register("observacoes")}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={fecharDialog} disabled={createMutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Agendar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
