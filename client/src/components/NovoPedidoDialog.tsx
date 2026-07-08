import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";

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

interface NovoPedidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataInicial?: Date;
  pedidoParaEditar?: {
    id: number;
    nomeCliente: string;
    colaboradorId: number;
    dataEvento: Date;
    dataEntrega: Date;
    ruaEntrega: string;
    bairroEntrega: string;
    numeroEntrega: string;
    valorTotal: number;
    valorTaxaEntrega: number;
    observacoes: string | null;
    itens: { id: number; itemId: number; nome: string; quantidade: number; valorUnitario: number }[];
    kits: { id: number; kitId: number; nome: string; quantidade: number; valorUnitario: number }[];
  } | null;
}

export default function NovoPedidoDialog({ open, onOpenChange, dataInicial, pedidoParaEditar }: NovoPedidoDialogProps) {
  const [itensComposicao, setItensComposicao] = useState<ItemPedido[]>([]);
  const [kitsComposicao, setKitsComposicao] = useState<KitPedido[]>([]);
  const [itemSelecionado, setItemSelecionado] = useState<string>("");
  const [qtdItem, setQtdItem] = useState<string>("1");
  const [erroQtdItem, setErroQtdItem] = useState<string>("");
  const [kitSelecionado, setKitSelecionado] = useState<string>("");
  const [qtdKit, setQtdKit] = useState<string>("1");

  const utils = trpc.useUtils();
  const { data: meData } = trpc.auth.me.useQuery();
  const { data: colaboradoresList = [] } = trpc.colaboradores.list.useQuery();
  const { data: itensList = [] } = trpc.itens.list.useQuery();
  const { data: kitsList = [] } = trpc.kits.list.useQuery();

  const colaboradorVinculado = meData?.colaboradorId ?? null;
  const colaboradorNome = meData?.colaboradorNome ?? null;
  const isEditing = !!pedidoParaEditar;

  const createMutation = trpc.pedidos.create.useMutation({
    onSuccess: () => {
      toast.success("Pedido criado!");
      utils.pedidos.list.invalidate();
      utils.itens.list.invalidate();
      utils.dashboard.getPedidosCalendario.invalidate();
      fecharDialog();
    },
    onError: (error) => toast.error(`Erro ao criar pedido: ${error.message}`),
  });

  const updateMutation = trpc.pedidos.update.useMutation({
    onSuccess: () => {
      toast.success("Pedido atualizado!");
      utils.pedidos.list.invalidate();
      utils.itens.list.invalidate();
      utils.dashboard.getPedidosCalendario.invalidate();
      fecharDialog();
    },
    onError: (error) => toast.error(`Erro ao atualizar pedido: ${error.message}`),
  });

  const { register, handleSubmit, reset, control, formState: { errors }, watch } = useForm<PedidoForm>({
    resolver: zodResolver(pedidoSchema),
  });

  // Pré-preencher formulário quando editando
  useEffect(() => {
    if (pedidoParaEditar && open) {
      reset({
        nomeCliente: pedidoParaEditar.nomeCliente,
        colaboradorId: String(pedidoParaEditar.colaboradorId),
        dataEvento: format(new Date(pedidoParaEditar.dataEvento), "yyyy-MM-dd'T'HH:mm"),
        dataEntrega: format(new Date(pedidoParaEditar.dataEntrega), "yyyy-MM-dd'T'HH:mm"),
        ruaEntrega: pedidoParaEditar.ruaEntrega,
        bairroEntrega: pedidoParaEditar.bairroEntrega,
        numeroEntrega: pedidoParaEditar.numeroEntrega,
        valorTaxaEntrega: pedidoParaEditar.valorTaxaEntrega,
        observacoes: pedidoParaEditar.observacoes ?? "",
      });
      setItensComposicao(
        pedidoParaEditar.itens.map((i) => ({
          itemId: i.itemId,
          nome: i.nome,
          quantidade: i.quantidade,
          valorUnitario: i.valorUnitario,
        }))
      );
      setKitsComposicao(
        pedidoParaEditar.kits.map((k) => ({
          kitId: k.kitId,
          nome: k.nome,
          quantidade: k.quantidade,
          valorUnitario: k.valorUnitario,
        }))
      );
    } else if (!pedidoParaEditar && open) {
      // Modo criação: pré-preencher colaborador vinculado
      if (colaboradorVinculado) {
        reset((prev) => ({ ...prev, colaboradorId: String(colaboradorVinculado) }));
      }
    }
  }, [pedidoParaEditar, open, reset, colaboradorVinculado]);

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

  const valorTotalCalculado = useMemo(() => {
    const totalItens = itensComposicao.reduce((acc, i) => acc + i.valorUnitario * i.quantidade, 0);
    const totalKits = kitsComposicao.reduce((acc, k) => acc + k.valorUnitario * k.quantidade, 0);
    return totalItens + totalKits;
  }, [itensComposicao, kitsComposicao]);

  const valorTaxaEntregaWatch = watch("valorTaxaEntrega");
  const totalComTaxa = useMemo(() => {
    const taxaCentavos = Math.round((valorTaxaEntregaWatch || 0) * 100);
    return valorTotalCalculado + taxaCentavos;
  }, [valorTotalCalculado, valorTaxaEntregaWatch]);

  function fecharDialog() {
    setItensComposicao([]);
    setKitsComposicao([]);
    setItemSelecionado("");
    setKitSelecionado("");
    setQtdItem("1");
    setQtdKit("1");
    setErroQtdItem("");
    reset();
    onOpenChange(false);
  }

  function adicionarItem() {
    if (!itemSelecionado) return;
    const id = Number(itemSelecionado);
    const itemInfo = itensList.find((i) => i.id === id);
    if (!itemInfo) return;
    const qtd = parseInt(qtdItem) || 1;

    const jaAdicionado = itensComposicao.find((c) => c.itemId === id);
    const qtdJaReservada = jaAdicionado ? jaAdicionado.quantidade : 0;
    const dispInfo = disponibilidadeItens.find((d) => d.id === id);
    // Ao editar, somar a quantidade atual do item neste pedido à disponibilidade
    const qtdAtualNoPedido = isEditing && pedidoParaEditar
      ? (pedidoParaEditar.itens.find((i) => i.itemId === id)?.quantidade ?? 0)
      : 0;
    const maxDisponivel = (dispInfo?.disponivel ?? 0) + qtdAtualNoPedido - qtdJaReservada;

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

    const jaAdicionado = kitsComposicao.find((c) => c.kitId === id);
    const qtdJaReservada = jaAdicionado ? jaAdicionado.quantidade : 0;
    const dispKitInfo = disponibilidadeKits.find((d) => d.id === id);
    // Ao editar, somar a quantidade atual do kit neste pedido à disponibilidade
    const qtdAtualNoPedido = isEditing && pedidoParaEditar
      ? (pedidoParaEditar.kits.find((k) => k.kitId === id)?.quantidade ?? 0)
      : 0;
    const maxDisponivelKit = (dispKitInfo?.disponivel ?? 0) + qtdAtualNoPedido - qtdJaReservada;
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

  function removerItem(idx: number) {
    setItensComposicao((prev) => prev.filter((_, i) => i !== idx));
  }

  function removerKit(idx: number) {
    setKitsComposicao((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(data: PedidoForm) {
    if (itensComposicao.length === 0 && kitsComposicao.length === 0) {
      toast.error("Adicione pelo menos um item ou kit");
      return;
    }

    const dataEvento = new Date(data.dataEvento);
    const dataEntrega = new Date(data.dataEntrega);
    const valorTaxaEntrega = Math.round((data.valorTaxaEntrega || 0) * 100);

    if (isEditing && pedidoParaEditar) {
      await updateMutation.mutateAsync({
        id: pedidoParaEditar.id,
        nomeCliente: data.nomeCliente,
        colaboradorId: Number(data.colaboradorId),
        dataEvento,
        dataEntrega,
        ruaEntrega: data.ruaEntrega,
        bairroEntrega: data.bairroEntrega,
        numeroEntrega: data.numeroEntrega,
        valorTaxaEntrega,
        observacoes: data.observacoes || "",
        itens: itensComposicao,
        kits: kitsComposicao,
      });
    } else {
      await createMutation.mutateAsync({
        nomeCliente: data.nomeCliente,
        colaboradorId: Number(data.colaboradorId),
        dataEvento,
        dataEntrega,
        ruaEntrega: data.ruaEntrega,
        bairroEntrega: data.bairroEntrega,
        numeroEntrega: data.numeroEntrega,
        valorTaxaEntrega,
        observacoes: data.observacoes || "",
        itens: itensComposicao,
        kits: kitsComposicao,
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Pedido" : "Novo Pedido"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Seção 1: Dados Básicos */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Dados Básicos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nomeCliente" className="text-xs">Nome do Cliente</Label>
                <Input
                  id="nomeCliente"
                  {...register("nomeCliente")}
                  placeholder="Ex: João Silva"
                  className="text-sm"
                />
                {errors.nomeCliente && <p className="text-xs text-red-500 mt-1">{errors.nomeCliente.message}</p>}
              </div>

              <div>
                <Label htmlFor="colaboradorId" className="text-xs">Colaborador</Label>
                {colaboradorVinculado ? (
                  <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
                    {colaboradorNome || "Colaborador vinculado"}
                  </div>
                ) : (
                  <Controller
                  name="colaboradorId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Selecione..." />
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
                )}
                {errors.colaboradorId && <p className="text-xs text-red-500 mt-1">{errors.colaboradorId.message}</p>}
              </div>

              <div>
                <Label htmlFor="dataEvento" className="text-xs">Data do Evento</Label>
                <Input
                  id="dataEvento"
                  type="datetime-local"
                  {...register("dataEvento")}
                  defaultValue={dataInicial ? format(dataInicial, "yyyy-MM-dd'T'HH:mm") : ""}
                  className="text-sm"
                />
                {errors.dataEvento && <p className="text-xs text-red-500 mt-1">{errors.dataEvento.message}</p>}
              </div>

              <div>
                <Label htmlFor="dataEntrega" className="text-xs">Data de Entrega</Label>
                <Input
                  id="dataEntrega"
                  type="datetime-local"
                  {...register("dataEntrega")}
                  className="text-sm"
                  />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="ruaEntrega" className="text-xs">Rua</Label>
                  <Input
                    id="ruaEntrega"
                    {...register("ruaEntrega")}
                    placeholder="Rua..."
                    className="text-sm"
                  />
                  {errors.ruaEntrega && <p className="text-xs text-red-500 mt-1">{errors.ruaEntrega.message}</p>}
                </div>
                <div>
                  <Label htmlFor="numeroEntrega" className="text-xs">Número</Label>
                  <Input
                    id="numeroEntrega"
                    {...register("numeroEntrega")}
                    placeholder="Número..."
                    className="text-sm"
                  />
                  {errors.numeroEntrega && <p className="text-xs text-red-500 mt-1">{errors.numeroEntrega.message}</p>}
                </div>
                <div>
                  <Label htmlFor="bairroEntrega" className="text-xs">Bairro</Label>
                  <Input
                    id="bairroEntrega"
                    {...register("bairroEntrega")}
                    placeholder="Bairro..."
                    className="text-sm"
                  />
                  {errors.bairroEntrega && <p className="text-xs text-red-500 mt-1">{errors.bairroEntrega.message}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="valorTaxaEntrega" className="text-xs">Taxa de Entrega (R$)</Label>
                <Input
                  id="valorTaxaEntrega"
                  type="number"
                  step="0.01"
                  {...register("valorTaxaEntrega", { valueAsNumber: true })}
                  placeholder="0.00"
                  className="text-sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="observacoes" className="text-xs">Observações</Label>
              <Textarea
                id="observacoes"
                {...register("observacoes")}
                placeholder="Notas adicionais..."
                className="text-sm"
                rows={2}
              />
            </div>
          </div>

          {/* Seção 2: Composição */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Composição</h3>

            {/* Adicionar Itens */}
            <div className="space-y-2">
              <p className="text-xs font-medium">Adicionar Itens</p>
              <div className="flex gap-2 flex-wrap">
                <Select value={itemSelecionado} onValueChange={setItemSelecionado}>
                  <SelectTrigger className="w-40 text-sm">
                    <SelectValue placeholder="Selecione item..." />
                  </SelectTrigger>
                  <SelectContent>
                    {itensList.map((i) => {
                      const qtdAtualNoPedido = isEditing && pedidoParaEditar
                        ? (pedidoParaEditar.itens.find((ip) => ip.itemId === i.id)?.quantidade ?? 0)
                        : 0;
                      const disp = (disponibilidadeItens.find(d => d.id === i.id)?.disponivel ?? 0) + qtdAtualNoPedido;
                      return (
                        <SelectItem key={i.id} value={String(i.id)} disabled={disp <= 0}>
                          {i.nome} (Disp: {disp})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {dataEntregaValue && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    em {format(new Date(dataEntregaValue), "dd/MM")}
                  </span>
                )}
                <Input
                  type="number"
                  min="1"
                  value={qtdItem}
                  onChange={(e) => setQtdItem(e.target.value)}
                  placeholder="Qtd"
                  className="w-16 text-sm"
                />
                <Button type="button" size="sm" onClick={adicionarItem} className="text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
              {erroQtdItem && <p className="text-xs text-red-500">{erroQtdItem}</p>}
            </div>

            {/* Adicionar Kits */}
            <div className="space-y-2">
              <p className="text-xs font-medium">Adicionar Kits</p>
              <div className="flex gap-2 flex-wrap">
                <Select value={kitSelecionado} onValueChange={setKitSelecionado}>
                  <SelectTrigger className="w-40 text-sm">
                    <SelectValue placeholder="Selecione kit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {kitsList.map((k) => {
                      const qtdAtualNoPedido = isEditing && pedidoParaEditar
                        ? (pedidoParaEditar.kits.find((kp) => kp.kitId === k.id)?.quantidade ?? 0)
                        : 0;
                      const disp = (disponibilidadeKits.find(d => d.id === k.id)?.disponivel ?? 0) + qtdAtualNoPedido;
                      return (
                        <SelectItem key={k.id} value={String(k.id)} disabled={disp <= 0}>
                          {k.nome} (Disp: {disp})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {dataEntregaValue && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    em {format(new Date(dataEntregaValue), "dd/MM")}
                  </span>
                )}
                <Input
                  type="number"
                  min="1"
                  value={qtdKit}
                  onChange={(e) => setQtdKit(e.target.value)}
                  placeholder="Qtd"
                  className="w-16 text-sm"
                />
                <Button type="button" size="sm" onClick={adicionarKit} className="text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
            </div>

            {/* Tabela de Itens */}
            {itensComposicao.length > 0 && (
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensComposicao.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.nome}</TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">R$ {(item.valorUnitario / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {((item.valorUnitario * item.quantidade) / 100).toFixed(2)}</TableCell>
                        <TableCell>
                          <button type="button" onClick={() => removerItem(idx)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Tabela de Kits */}
            {kitsComposicao.length > 0 && (
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kit</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kitsComposicao.map((kit, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{kit.nome}</TableCell>
                        <TableCell className="text-right">{kit.quantidade}</TableCell>
                        <TableCell className="text-right">R$ {(kit.valorUnitario / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {((kit.valorUnitario * kit.quantidade) / 100).toFixed(2)}</TableCell>
                        <TableCell>
                          <button type="button" onClick={() => removerKit(idx)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Resumo */}
            <div className="bg-muted p-3 rounded-lg space-y-1">
              <p className="text-xs font-semibold">Valor Total: R$ {(valorTotalCalculado / 100).toFixed(2)}</p>
              {(valorTaxaEntregaWatch || 0) > 0 && (
                <p className="text-xs font-semibold text-muted-foreground">
                  Total com taxa de entrega: R$ {(totalComTaxa / 100).toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={fecharDialog} className="text-sm">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="text-sm">
              {isPending
                ? (isEditing ? "Salvando..." : "Criando...")
                : (isEditing ? "Salvar alterações" : "Criar Pedido")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
