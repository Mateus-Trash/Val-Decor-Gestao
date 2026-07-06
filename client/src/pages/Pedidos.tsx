import { useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { ShoppingCart, Plus, Pencil, Trash2, X, MoreVertical } from "lucide-react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";

const statusOptions = ["Pendente", "Confirmado", "EntregueNaoPago", "EntreguePago", "Concluido"] as const;

const statusLabels: Record<string, string> = {
  Pendente: "Pendente",
  Confirmado: "Confirmado",
  EntregueNaoPago: "Entregue (Não Pago)",
  EntreguePago: "Entregue (Pago)",
  Concluido: "Concluído",
};

const statusColors: Record<string, string> = {
  Pendente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Confirmado: "bg-blue-100 text-blue-800 border-blue-300",
  EntregueNaoPago: "bg-red-200 text-red-900 border-red-400",
  EntreguePago: "bg-red-100 text-red-700 border-red-300",
  Concluido: "bg-green-100 text-green-800 border-green-300",
};

const pedidoSchema = z.object({
  nomeCliente: z.string().min(1, "Nome do cliente é obrigatório"),
  colaboradorId: z.string().min(1, "Colaborador é obrigatório"),
  dataEvento: z.string().min(1, "Data do evento é obrigatória"),
  dataEntrega: z.string().min(1, "Data de entrega é obrigatória"),
  ruaEntrega: z.string().min(1, "Rua é obrigatória"),
  bairroEntrega: z.string().min(1, "Bairro é obrigatório"),
  numeroEntrega: z.string().min(1, "Número é obrigatório"),
  valorTaxaEntrega: z.number().min(0).optional(),
  observacoes: z.string().optional(),
});

type PedidoForm = z.infer<typeof pedidoSchema>;

type ItemPedido = { itemId: number; nome: string; quantidade: number; valorUnitario: number };
type KitPedido = { kitId: number; nome: string; quantidade: number; valorUnitario: number };

export default function Pedidos() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("Todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  // Composição do pedido
  const [itensComposicao, setItensComposicao] = useState<ItemPedido[]>([]);
  const [kitsComposicao, setKitsComposicao] = useState<KitPedido[]>([]);
  const [itemSelecionado, setItemSelecionado] = useState<string>("");
  const [qtdItem, setQtdItem] = useState<string>("1");
  const [erroQtdItem, setErroQtdItem] = useState<string>("");
  const [kitSelecionado, setKitSelecionado] = useState<string>("");
  const [qtdKit, setQtdKit] = useState<string>("1");

  const utils = trpc.useUtils();

  const { data: pedidosList = [], isLoading } = trpc.pedidos.list.useQuery();
  const { data: colaboradoresList = [] } = trpc.colaboradores.list.useQuery();
  const { data: itensList = [] } = trpc.itens.list.useQuery();
  const { data: kitsList = [] } = trpc.kits.list.useQuery();

  const createMutation = trpc.pedidos.create.useMutation({
    onSuccess: () => {
      toast.success("Pedido criado!");
      utils.pedidos.list.invalidate();
      utils.itens.list.invalidate();
      fecharDialog();
    },
    onError: (error) => toast.error(`Erro ao criar pedido: ${error.message}`),
  });

  const updateMutation = trpc.pedidos.update.useMutation({
    onSuccess: () => {
      toast.success("Pedido atualizado!");
      utils.pedidos.list.invalidate();
      fecharDialog();
    },
    onError: (error) => toast.error(`Erro ao atualizar pedido: ${error.message}`),
  });

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

  const { register, handleSubmit, reset, control, formState: { errors }, watch } = useForm<PedidoForm, unknown, PedidoForm>({
    resolver: zodResolver(pedidoSchema),
  });

  const dataEntregaValue = watch("dataEntrega");
  const dataParaDisponibilidade = useMemo(() => {
    if (dataEntregaValue) return new Date(dataEntregaValue);
    return new Date();
  }, [dataEntregaValue]);

  const { data: disponibilidadeItens = [] } = trpc.itens.getDisponibilidadePorData.useQuery(
    { data: dataParaDisponibilidade },
    { enabled: true }
  );
  const { data: disponibilidadeKits = [] } = trpc.kits.getDisponibilidadePorData.useQuery(
    { data: dataParaDisponibilidade },
    { enabled: true }
  );

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

  // Valor total calculado em tempo real
  const valorTotalCalculado = useMemo(() => {
    const totalItens = itensComposicao.reduce((acc, i) => acc + i.valorUnitario * i.quantidade, 0);
    const totalKits = kitsComposicao.reduce((acc, k) => acc + k.valorUnitario * k.quantidade, 0);
    return totalItens + totalKits;
  }, [itensComposicao, kitsComposicao]);

  function fecharDialog() {
    setDialogOpen(false);
    setEditandoId(null);
    setItensComposicao([]);
    setKitsComposicao([]);
    setItemSelecionado("");
    setKitSelecionado("");
    setQtdItem("1");
    setQtdKit("1");
    reset();
  }

  function abrirCriar() {
    setEditandoId(null);
    setItensComposicao([]);
    setKitsComposicao([]);
    reset({
      nomeCliente: "",
      colaboradorId: "",
      dataEvento: "",
      dataEntrega: "",
      ruaEntrega: "",
      bairroEntrega: "",
      numeroEntrega: "",
      valorTaxaEntrega: 0,
      observacoes: "",
    });
    setDialogOpen(true);
  }

  function abrirEditar(p: (typeof pedidosList)[number]) {
    setEditandoId(p.id);
    reset({
      nomeCliente: p.nomeCliente ?? "",
      colaboradorId: String(p.colaboradorId),
      dataEvento: p.dataEvento ? format(new Date(p.dataEvento), "yyyy-MM-dd'T'HH:mm") : "",
      dataEntrega: p.dataEntrega ? format(new Date(p.dataEntrega), "yyyy-MM-dd'T'HH:mm") : "",
      ruaEntrega: p.ruaEntrega,
      bairroEntrega: p.bairroEntrega,
      numeroEntrega: p.numeroEntrega ?? "",
      valorTaxaEntrega: p.valorTaxaEntrega ?? 0,
      observacoes: p.observacoes ?? "",
    });
    // Não carregamos itens/kits na edição (update não altera itens)
    setItensComposicao([]);
    setKitsComposicao([]);
    setDialogOpen(true);
  }

  function adicionarItem() {
    if (!itemSelecionado) return;
    const id = Number(itemSelecionado);
    const itemInfo = itensList.find((i) => i.id === id);
    if (!itemInfo) return;
    const qtd = parseInt(qtdItem) || 1;

    // Verificar disponibilidade
    const jaAdicionado = itensComposicao.find((c) => c.itemId === id);
    const qtdJaReservada = jaAdicionado ? jaAdicionado.quantidade : 0;
    const dispInfo = disponibilidadeItens.find((d) => d.id === id);
    const maxDisponivel = (dispInfo?.disponivel ?? 0) - qtdJaReservada;

    if (qtd > maxDisponivel) {
      setErroQtdItem(`Máximo disponível: ${maxDisponivel}`);
      return;
    }
    setErroQtdItem("");

    const existente = itensComposicao.findIndex((c) => c.itemId === id);
    if (existente >= 0) {
      setItensComposicao((prev) =>
        prev.map((c, idx) =>
          idx === existente ? { ...c, quantidade: c.quantidade + qtd } : c
        )
      );
    } else {
      setItensComposicao((prev) => [
        ...prev,
        { itemId: id, nome: itemInfo.nome, quantidade: qtd, valorUnitario: itemInfo.valorAluguel },
      ]);
    }
    setItemSelecionado("");
    setQtdItem("1");
  }

  function adicionarKit() {
    if (!kitSelecionado) return;
    const id = Number(kitSelecionado);
    const kitInfo = kitsList.find((k) => k.id === id);
    if (!kitInfo) return;
   const qtd = parseInt(qtdKit) || 1;

    // Verificar disponibilidade do kit
    const jaAdicionadoKit = kitsComposicao.find((c) => c.kitId === id);
    const qtdJaReservadaKit = jaAdicionadoKit ? jaAdicionadoKit.quantidade : 0;
    const dispKitInfo = disponibilidadeKits.find((d) => d.id === id);
    const maxDisponivelKit = (dispKitInfo?.disponivel ?? 0) - qtdJaReservadaKit;
    if (qtd > maxDisponivelKit) {
      toast.error(`Máximo disponível para este kit: ${maxDisponivelKit}`);
      return;
    }

    const existente = kitsComposicao.findIndex((c) => c.kitId === id);
    if (existente >= 0) {
      setKitsComposicao((prev) =>
        prev.map((c, idx) =>
          idx === existente ? { ...c, quantidade: c.quantidade + qtd } : c
        )
      );
    } else {
      setKitsComposicao((prev) => [
        ...prev,
        { kitId: id, nome: kitInfo.nome, quantidade: qtd, valorUnitario: kitInfo.valorAluguel },
      ]);
    }
    setKitSelecionado("");
    setQtdKit("1");
  }

  function confirmarDelete(id: number) {
    if (window.confirm("Deseja remover este pedido? O estoque será devolvido.")) {
      deleteMutation.mutate({ id });
    }
  }

  function onSubmit(data: PedidoForm) {
    if (editandoId !== null) {
      updateMutation.mutate({
        id: editandoId,
        dataEvento: new Date(data.dataEvento),
        dataEntrega: new Date(data.dataEntrega),
        ruaEntrega: data.ruaEntrega,
        bairroEntrega: data.bairroEntrega,
        numeroEntrega: data.numeroEntrega,
        valorTaxaEntrega: data.valorTaxaEntrega ?? 0,
        observacoes: data.observacoes,
      });
    } else {
      if (itensComposicao.length === 0 && kitsComposicao.length === 0) {
        toast.error("Adicione pelo menos um item ou kit ao pedido");
        return;
      }
      createMutation.mutate({
        nomeCliente: data.nomeCliente,
        colaboradorId: Number(data.colaboradorId),
        dataEvento: new Date(data.dataEvento),
        dataEntrega: new Date(data.dataEntrega),
        ruaEntrega: data.ruaEntrega,
        bairroEntrega: data.bairroEntrega,
        numeroEntrega: data.numeroEntrega,
        valorTaxaEntrega: data.valorTaxaEntrega ?? 0,
        observacoes: data.observacoes,
        itens: itensComposicao.map((i) => ({
          itemId: i.itemId,
          quantidade: i.quantidade,
          valorUnitario: i.valorUnitario,
        })),
        kits: kitsComposicao.map((k) => ({
          kitId: k.kitId,
          quantidade: k.quantidade,
          valorUnitario: k.valorUnitario,
        })),
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  function formatCurrency(value: number) {
    return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-6 sm:h-7 w-6 sm:w-7 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Pedidos</h1>
          </div>
          <Button onClick={abrirCriar} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : pedidosFiltrados.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum pedido encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Data Evento</TableHead>
                      <TableHead className="text-right">Valor Total (R$)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedidosFiltrados.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono">#{p.id}</TableCell>
                        <TableCell>{p.nomeCliente ?? "—"}</TableCell>
                        <TableCell>{p.nomeColaborador}</TableCell>
                        <TableCell>
                          {p.dataEvento ? format(new Date(p.dataEvento), "dd/MM/yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(p.valorTotal)}</TableCell>
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
                              <DropdownMenuItem onClick={() => abrirEditar(p)}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => confirmarDelete(p.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
          ) : pedidosFiltrados.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum pedido encontrado.</p>
          ) : (
            pedidosFiltrados.map((p) => (
              <Card key={p.id} className="p-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-semibold">#{p.id}</p>
                      <p className="text-xs text-muted-foreground">{p.nomeCliente || "Sem cliente"}</p>
                    </div>
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
                  </div>
                  <p className="text-xs"><span className="font-medium">Colaborador:</span> {p.nomeColaborador}</p>
                  <p className="text-xs"><span className="font-medium">Data:</span> {p.dataEvento ? format(new Date(p.dataEvento), "dd/MM/yyyy") : "—"}</p>
                  <p className="text-xs"><span className="font-medium">Total:</span> {formatCurrency(p.valorTotal)}</p>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => abrirEditar(p)} className="flex-1 h-8 text-xs">
                      Editar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => confirmarDelete(p.id)} className="flex-1 h-8 text-xs">
                      Deletar
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) fecharDialog(); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editandoId !== null ? "Editar Pedido" : "Novo Pedido"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Campos básicos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="nomeCliente">Cliente *</Label>
                <Input id="nomeCliente" {...register("nomeCliente")} placeholder="Nome do cliente" />
                {errors.nomeCliente && (
                  <p className="text-sm text-destructive">{errors.nomeCliente.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Colaborador *</Label>
                <Controller
                  name="colaboradorId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar colaborador..." />
                      </SelectTrigger>
                      <SelectContent>
                        {colaboradoresList.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.colaboradorId && (
                  <p className="text-sm text-destructive">{errors.colaboradorId.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="dataEvento">Data do Evento *</Label>
                <Input id="dataEvento" type="datetime-local" {...register("dataEvento")} />
                {errors.dataEvento && (
                  <p className="text-sm text-destructive">{errors.dataEvento.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="dataEntrega">Data de Entrega *</Label>
                <Input id="dataEntrega" type="datetime-local" {...register("dataEntrega")} />
                {errors.dataEntrega && (
                  <p className="text-sm text-destructive">{errors.dataEntrega.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="valorTaxaEntrega">Taxa de Entrega (R$)</Label>
                <Input
                  id="valorTaxaEntrega"
                  type="number"
                  step="0.01"
                  {...register("valorTaxaEntrega", { valueAsNumber: true })}
                  placeholder="0,00"
                />
              </div>
            </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="ruaEntrega">Rua *</Label>
                  <Input id="ruaEntrega" {...register("ruaEntrega")} placeholder="Rua..." />
                  {errors.ruaEntrega && (
                    <p className="text-sm text-destructive">{errors.ruaEntrega.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="numeroEntrega">Número *</Label>
                  <Input id="numeroEntrega" {...register("numeroEntrega")} placeholder="Número..." />
                  {errors.numeroEntrega && (
                    <p className="text-sm text-destructive">{errors.numeroEntrega.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bairroEntrega">Bairro *</Label>
                  <Input id="bairroEntrega" {...register("bairroEntrega")} placeholder="Bairro..." />
                  {errors.bairroEntrega && (
                    <p className="text-sm text-destructive">{errors.bairroEntrega.message}</p>
                  )}
                </div>
              </div>

            <div className="space-y-1">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" {...register("observacoes")} placeholder="Notas adicionais..." rows={3} />
            </div>

            {/* Composição de itens e kits (apenas na criação) */}
            {editandoId === null && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Composição do Pedido</h3>

                  {/* Adicionar itens */}
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Select value={itemSelecionado} onValueChange={setItemSelecionado}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar item..." />
                        </SelectTrigger>
                        <SelectContent>
                          {itensList.map((i) => (
                            <SelectItem key={i.id} value={String(i.id)}>
                              {i.nome} (Disp: {disponibilidadeItens.find(d => d.id === i.id)?.disponivel ?? 0})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="1"
                        value={qtdItem}
                        onChange={(e) => setQtdItem(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="Qtd"
                      />
                      <Button type="button" onClick={adicionarItem} variant="outline" className="w-full">
                        Adicionar
                      </Button>
                    </div>
                    {erroQtdItem && <p className="text-sm text-destructive">{erroQtdItem}</p>}
                  </div>

                  {/* Lista de itens adicionados */}
                  {itensComposicao.length > 0 && (
                    <div className="mb-4 p-3 bg-muted rounded-lg space-y-2">
                      {itensComposicao.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span>{item.nome} x{item.quantidade}</span>
                          <div className="flex items-center gap-2">
                            <span>{formatCurrency(item.valorUnitario * item.quantidade)}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => setItensComposicao((prev) => prev.filter((_, i) => i !== idx))}
                              className="h-6 w-6"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Adicionar kits */}
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Select value={kitSelecionado} onValueChange={setKitSelecionado}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar kit..." />
                        </SelectTrigger>
                        <SelectContent>
                          {kitsList.map((k) => (
                            <SelectItem key={k.id} value={String(k.id)} disabled={(disponibilidadeKits.find(d => d.id === k.id)?.disponivel ?? 0) <= 0}>
                              {k.nome} (Disp: {disponibilidadeKits.find(d => d.id === k.id)?.disponivel ?? 0})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="1"
                        value={qtdKit}
                        onChange={(e) => setQtdKit(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="Qtd"
                      />
                      <Button type="button" onClick={adicionarKit} variant="outline" className="w-full">
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  {/* Lista de kits adicionados */}
                  {kitsComposicao.length > 0 && (
                    <div className="mb-4 p-3 bg-muted rounded-lg space-y-2">
                      {kitsComposicao.map((kit, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span>{kit.nome} x{kit.quantidade}</span>
                          <div className="flex items-center gap-2">
                            <span>{formatCurrency(kit.valorUnitario * kit.quantidade)}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => setKitsComposicao((prev) => prev.filter((_, i) => i !== idx))}
                              className="h-6 w-6"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total */}
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="font-semibold text-sm">
                      Total: {formatCurrency(valorTotalCalculado)}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Botões */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={fecharDialog} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : editandoId !== null ? "Atualizar" : "Criar Pedido"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
