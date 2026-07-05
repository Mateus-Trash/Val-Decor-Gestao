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
import { ShoppingCart, Plus, Pencil, Trash2, X } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";

const statusOptions = ["Pendente", "Confirmado", "Em Preparacao", "Entregue", "Concluido"] as const;

const statusColors: Record<string, string> = {
  Pendente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Confirmado: "bg-blue-100 text-blue-800 border-blue-300",
  "Em Preparacao": "bg-purple-100 text-purple-800 border-purple-300",
  Entregue: "bg-orange-100 text-orange-800 border-orange-300",
  Concluido: "bg-green-100 text-green-800 border-green-300",
};

const pedidoSchema = z.object({
  nomeCliente: z.string().min(1, "Nome do cliente é obrigatório"),
  colaboradorId: z.string().min(1, "Colaborador é obrigatório"),
  dataEvento: z.string().min(1, "Data do evento é obrigatória"),
  dataEntrega: z.string().min(1, "Data de entrega é obrigatória"),
  dataColeta: z.string().min(1, "Data de coleta é obrigatória"),
  enderecoEntrega: z.string().min(1, "Endereço é obrigatório"),
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

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<PedidoForm, unknown, PedidoForm>({
    resolver: zodResolver(pedidoSchema),
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
      dataColeta: "",
      enderecoEntrega: "",
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
      dataColeta: p.dataColeta ? format(new Date(p.dataColeta), "yyyy-MM-dd'T'HH:mm") : "",
      enderecoEntrega: p.enderecoEntrega ?? "",
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
    const maxDisponivel = itemInfo.quantidadeDisponivel - qtdJaReservada;

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
        dataColeta: new Date(data.dataColeta),
        enderecoEntrega: data.enderecoEntrega,
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
        dataColeta: new Date(data.dataColeta),
        enderecoEntrega: data.enderecoEntrega,
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
          </div>
          <Button onClick={abrirCriar}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex gap-4 flex-wrap">
          <Input
            placeholder="Buscar por cliente ou colaborador..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="max-w-sm"
          />
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <Card>
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
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => abrirEditar(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => confirmarDelete(p.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) fecharDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editandoId !== null ? "Editar Pedido" : "Novo Pedido"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Campos básicos */}
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="dataEvento">Data Evento *</Label>
                <Input id="dataEvento" type="datetime-local" {...register("dataEvento")} />
                {errors.dataEvento && (
                  <p className="text-sm text-destructive">{errors.dataEvento.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="dataEntrega">Data Entrega *</Label>
                <Input id="dataEntrega" type="datetime-local" {...register("dataEntrega")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dataColeta">Data Coleta *</Label>
                <Input id="dataColeta" type="datetime-local" {...register("dataColeta")} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="enderecoEntrega">Endereço de Entrega *</Label>
              <Input id="enderecoEntrega" {...register("enderecoEntrega")} placeholder="Endereço completo" />
              {errors.enderecoEntrega && (
                <p className="text-sm text-destructive">{errors.enderecoEntrega.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="valorTaxaEntrega">Taxa de Entrega (R$)</Label>
                <Input
                  id="valorTaxaEntrega"
                  type="number"
                  step={0.01}
                  min={0}
                  {...register("valorTaxaEntrega", { valueAsNumber: true })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea id="observacoes" {...register("observacoes")} placeholder="Observações..." />
              </div>
            </div>

            {/* Seção Itens — só no criar */}
            {editandoId === null && (
              <>
                <div className="space-y-3 border rounded-md p-3">
                  <p className="font-medium text-sm">Itens</p>
                  <div className="flex gap-2 items-start">
                    <Select value={itemSelecionado} onValueChange={(v) => { setItemSelecionado(v); setErroQtdItem(""); }}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecionar item..." />
                      </SelectTrigger>
                      <SelectContent>
                        {itensList.map((item) => (
                          <SelectItem
                            key={item.id}
                            value={String(item.id)}
                            disabled={item.quantidadeDisponivel === 0}
                          >
                            <span className={item.quantidadeDisponivel === 0 ? "text-muted-foreground" : ""}>
                              {item.nome} — {formatCurrency(item.valorAluguel)}
                              <span className="text-xs text-muted-foreground ml-1">({item.quantidadeDisponivel} disponíveis)</span>
                            </span>
                            {item.quantidadeDisponivel === 0 && (
                              <span className="ml-2 text-xs bg-red-100 text-red-700 rounded px-1">Sem estoque</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-col">
                      <Input
                        type="number"
                        min={1}
                        value={qtdItem}
                        onChange={(e) => {
                          setQtdItem(e.target.value);
                          // Validar reativamente
                          const val = parseInt(e.target.value) || 1;
                          if (itemSelecionado) {
                            const id = Number(itemSelecionado);
                            const itemInfo = itensList.find((i) => i.id === id);
                            if (itemInfo) {
                              const jaAdicionado = itensComposicao.find((c) => c.itemId === id);
                              const qtdJaReservada = jaAdicionado ? jaAdicionado.quantidade : 0;
                              const maxDisponivel = itemInfo.quantidadeDisponivel - qtdJaReservada;
                              if (val > maxDisponivel) {
                                setErroQtdItem(`Máximo disponível: ${maxDisponivel}`);
                              } else {
                                setErroQtdItem("");
                              }
                            }
                          } else {
                            setErroQtdItem("");
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-20"
                        placeholder="Qtd"
                      />
                      {erroQtdItem && (
                        <p className="text-xs text-destructive mt-0.5 whitespace-nowrap">{erroQtdItem}</p>
                      )}
                    </div>
                    <Button type="button" variant="outline" onClick={adicionarItem} disabled={!itemSelecionado || !!erroQtdItem}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {itensComposicao.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">Nenhum item adicionado.</p>
                  ) : (
                    <ul className="space-y-1">
                      {itensComposicao.map((c) => (
                        <li key={c.itemId} className="flex items-center justify-between text-sm bg-muted rounded px-3 py-1.5">
                          <span>
                            <span className="font-medium">{c.nome}</span>
                            <span className="text-muted-foreground ml-2">× {c.quantidade}</span>
                            <span className="text-muted-foreground ml-2">({formatCurrency(c.valorUnitario)} un.)</span>
                          </span>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setItensComposicao((prev) => prev.filter((i) => i.itemId !== c.itemId))}>
                            <X className="h-3 w-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Seção Kits */}
                <div className="space-y-3 border rounded-md p-3">
                  <p className="font-medium text-sm">Kits</p>
                  <div className="flex gap-2">
                    <Select value={kitSelecionado} onValueChange={setKitSelecionado}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecionar kit..." />
                      </SelectTrigger>
                      <SelectContent>
                        {kitsList.map((kit) => (
                          <SelectItem key={kit.id} value={String(kit.id)}>
                            🎁 {kit.nome} — {formatCurrency(kit.valorAluguel)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={qtdKit}
                      onChange={(e) => setQtdKit(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-20"
                      placeholder="Qtd"
                    />
                    <Button type="button" variant="outline" onClick={adicionarKit} disabled={!kitSelecionado}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {kitsComposicao.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">Nenhum kit adicionado.</p>
                  ) : (
                    <ul className="space-y-1">
                      {kitsComposicao.map((c) => (
                        <li key={c.kitId} className="flex items-center justify-between text-sm bg-muted rounded px-3 py-1.5">
                          <span>
                            <span className="font-medium">🎁 {c.nome}</span>
                            <span className="text-muted-foreground ml-2">× {c.quantidade}</span>
                            <span className="text-muted-foreground ml-2">({formatCurrency(c.valorUnitario)} un.)</span>
                          </span>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setKitsComposicao((prev) => prev.filter((k) => k.kitId !== c.kitId))}>
                            <X className="h-3 w-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Valor total */}
                <div className="flex justify-end border-t pt-3">
                  <p className="text-lg font-bold">
                    Total: {formatCurrency(valorTotalCalculado)}
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={fecharDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : editandoId !== null ? "Salvar" : "Criar Pedido"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
