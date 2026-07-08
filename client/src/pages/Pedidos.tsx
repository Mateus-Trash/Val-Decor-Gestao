import { Fragment, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { trpc } from "@/lib/trpc";
import { ShoppingCart, Plus, Pencil, Trash2, MoreVertical, User, Calendar, DollarSign, Truck } from "lucide-react";
import EntityCard from "@/components/EntityCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/PageHeading";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { format } from "date-fns";
import NovoPedidoDialog from "@/components/NovoPedidoDialog";

const statusOptions = ["Pendente", "Confirmado", "EntregueNaoPago", "EntreguePago", "Concluido"] as const;

const statusLabels: Record<string, string> = {
  Pendente: "Pendente",
  Confirmado: "Confirmado",
  EntregueNaoPago: "Entregue (Não Pago)",
  EntreguePago: "Entregue (Pago)",
  Concluido: "Concluído",
};

const statusColors: Record<string, string> = {
  Pendente: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  Confirmado: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800",
  EntregueNaoPago: "bg-red-200 text-red-900 border-red-400 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  EntreguePago: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  Concluido: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
};

export default function Pedidos() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("Todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: pedidosList = [], isLoading } = trpc.pedidos.list.useQuery();

  // Buscar pedido completo quando editando
  const { data: pedidoParaEditar } = trpc.pedidos.getById.useQuery(
    { id: editandoId! },
    { enabled: editandoId !== null }
  );

  const updateStatusMutation = trpc.pedidos.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      utils.pedidos.list.invalidate();
    },
    onError: (error) => toast.error(`Erro ao atualizar status: ${error.message}`),
  });

  const deleteMutation = trpc.pedidos.delete.useMutation({
    onSuccess: () => {
      toast.success("Pedido removido!");
      utils.pedidos.list.invalidate();
      utils.itens.list.invalidate();
      utils.dashboard.getKPIs.invalidate();
    },
    onError: (error) => toast.error(`Erro ao remover pedido: ${error.message}`),
  });

  const pedidosFiltrados = useMemo(() => {
    let resultado = pedidosList;
    if (filtroStatus !== "Todos") {
      resultado = resultado.filter((p) => p.status === filtroStatus);
    }
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      resultado = resultado.filter(
        (p) =>
          (p.nomeCliente && p.nomeCliente.toLowerCase().includes(termo)) ||
          p.nomeColaborador.toLowerCase().includes(termo)
      );
    }
    return resultado;
  }, [pedidosList, filtroStatus, busca]);

  function abrirCriar() {
    setEditandoId(null);
    setDialogOpen(true);
  }

  function abrirEditar(id: number) {
    setEditandoId(id);
    setDialogOpen(true);
  }

  function fecharDialog() {
    setDialogOpen(false);
    setEditandoId(null);
  }

  function confirmarDelete(id: number) {
    if (window.confirm("Deseja remover este pedido? O estoque será devolvido.")) {
      deleteMutation.mutate({ id });
    }
  }

  function formatCurrency(value: number) {
    return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatReais(value: number) {
    return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* Header */}
        <PageHeading icon={<ShoppingCart className="h-6 sm:h-7 w-6 sm:w-7 text-primary" />} title="Pedidos">
          <Button onClick={abrirCriar} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
          </Button>
        </PageHeading>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Input
            placeholder="Buscar cliente ou colaborador..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1"
          />
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela Desktop */}
        <Card className="hidden sm:block">
          <CardHeader>
            <CardTitle>Lista de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : pedidosFiltrados.length === 0 ? (
              <EmptyState icon={ShoppingCart} message="Nenhum pedido encontrado." actionLabel="Novo Pedido" onAction={abrirCriar} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Data Evento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Taxa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedidosFiltrados.map((p) => (
                      <Fragment key={p.id}>
                      <TableRow className="transition-colors duration-200 hover:bg-muted/50">
                        <TableCell className="font-mono">#{p.id}</TableCell>
                        <TableCell>{p.nomeCliente ?? "—"}</TableCell>
                        <TableCell>{p.nomeColaborador}</TableCell>
                        <TableCell>
                          {p.dataEvento ? format(new Date(p.dataEvento), "dd/MM/yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(p.valorTotal)}</TableCell>
                        <TableCell className="text-right text-xs">{formatReais(p.valorTaxaEntrega)}</TableCell>
                        <TableCell>
                          <Select
                            value={p.status}
                            onValueChange={(value) =>
                              updateStatusMutation.mutate({ id: p.id, status: value as typeof statusOptions[number] })
                            }
                          >
                            <SelectTrigger className={`w-40 text-xs border ${statusColors[p.status] ?? ""}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((s) => (
                                <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => abrirEditar(p.id)}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => confirmarDelete(p.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {(p.composicaoItens.length > 0 || p.composicaoKits.length > 0) && (
                        <TableRow className="bg-muted/30 hover:bg-muted/40">
                          <TableCell colSpan={8} className="py-2">
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                              {p.composicaoItens.map((item, idx) => (
                                <span key={`i-${idx}`} className="text-muted-foreground">
                                  <span className="font-medium text-foreground">{item.nome}</span> — {item.quantidade}x
                                </span>
                              ))}
                              {p.composicaoKits.map((kit, idx) => (
                                <span key={`k-${idx}`} className="text-muted-foreground">
                                  <span className="font-medium text-foreground">{kit.nome}</span> — {kit.quantidade}x
                                </span>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      </Fragment>
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
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : pedidosFiltrados.length === 0 ? (
            <EmptyState icon={ShoppingCart} message="Nenhum pedido encontrado." actionLabel="Novo Pedido" onAction={abrirCriar} />
          ) : (
            pedidosFiltrados.map((p) => (
              <EntityCard
                key={p.id}
                title={`#${p.id}`}
                subtitle={p.nomeCliente || "Sem cliente"}
                badge={
                  <Select
                    value={p.status}
                    onValueChange={(value) =>
                      updateStatusMutation.mutate({ id: p.id, status: value as typeof statusOptions[number] })
                    }
                  >
                    <SelectTrigger className={`w-28 h-8 text-xs border ${statusColors[p.status] ?? ""}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
                fields={[
                  { icon: User, label: "Colaborador", value: p.nomeColaborador },
                  { icon: Calendar, label: "Data", value: p.dataEvento ? format(new Date(p.dataEvento), "dd/MM/yyyy") : "—" },
                  { icon: DollarSign, label: "Total", value: formatCurrency(p.valorTotal) },
                  { icon: Truck, label: "Taxa Entrega", value: formatReais(p.valorTaxaEntrega) },
                ]}
                actions={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => abrirEditar(p.id)}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => confirmarDelete(p.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              >
                {(p.composicaoItens.length > 0 || p.composicaoKits.length > 0) && (
                  <div className="rounded-md bg-muted/50 p-2 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Composição</p>
                    {p.composicaoItens.map((item, idx) => (
                      <div key={`item-${idx}`} className="flex justify-between text-xs">
                        <span>{item.nome}</span>
                        <span className="font-medium">{item.quantidade}x</span>
                      </div>
                    ))}
                    {p.composicaoKits.map((kit, idx) => (
                      <div key={`kit-${idx}`} className="flex justify-between text-xs">
                        <span>{kit.nome}</span>
                        <span className="font-medium">{kit.quantidade}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </EntityCard>
            ))
          )}
        </div>
      </div>

      {/* Dialog criar/editar usando NovoPedidoDialog */}
      <NovoPedidoDialog
        open={dialogOpen}
        onOpenChange={(open) => { if (!open) fecharDialog(); }}
        pedidoParaEditar={editandoId !== null && pedidoParaEditar ? {
          id: pedidoParaEditar.id,
          nomeCliente: pedidoParaEditar.nomeCliente,
          colaboradorId: pedidoParaEditar.colaboradorId,
          dataEvento: pedidoParaEditar.dataEvento,
          dataEntrega: pedidoParaEditar.dataEntrega,
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
