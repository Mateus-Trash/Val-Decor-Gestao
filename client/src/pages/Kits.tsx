import { useState } from "react";
import { dismissKeyboardOnEnter } from "@/lib/formUtils";
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
import { Layers, Plus, Pencil, Trash2, X, MoreVertical, DollarSign } from "lucide-react";
import EntityCard from "@/components/EntityCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/PageHeading";
import { EmptyState } from "@/components/EmptyState";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const kitSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  valorAluguel: z.number().positive("Valor de aluguel deve ser positivo"),
});

type KitForm = z.infer<typeof kitSchema>;

type ItemComposicao = {
  itemId: number;
  nome: string;
  quantidade: number;
};

export default function Kits() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [composicao, setComposicao] = useState<ItemComposicao[]>([]);
  const [itemSelecionado, setItemSelecionado] = useState<string>("");
  const [qtdItem, setQtdItem] = useState<string>("1");

  const utils = trpc.useUtils();

  const { data: kits = [], isLoading } = trpc.kits.list.useQuery();
  const { data: itensDisponiveis = [] } = trpc.itens.list.useQuery();

  const createMutation = trpc.kits.create.useMutation({
    onSuccess: () => {
      toast.success("Kit criado!");
      utils.kits.list.invalidate();
      fecharDialog();
    },
    onError: (error) => toast.error(`Erro ao criar kit: ${error.message}`),
  });

  const updateMutation = trpc.kits.update.useMutation({
    onSuccess: () => {
      toast.success("Kit atualizado!");
      utils.kits.list.invalidate();
      fecharDialog();
    },
    onError: (error) => toast.error(`Erro ao atualizar kit: ${error.message}`),
  });

  const deleteMutation = trpc.kits.delete.useMutation({
    onSuccess: () => {
      toast.success("Kit removido!");
      utils.kits.list.invalidate();
    },
    onError: (error) => toast.error(`Erro ao remover kit: ${error.message}`),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<KitForm>({
    resolver: zodResolver(kitSchema),
  });

  function fecharDialog() {
    setDialogOpen(false);
    setEditandoId(null);
    setComposicao([]);
    setItemSelecionado("");
    setQtdItem("1");
    reset();
  }

  function abrirCriar() {
    setEditandoId(null);
    setComposicao([]);
    reset({ nome: "", descricao: "", valorAluguel: 0 });
    setDialogOpen(true);
  }

  function abrirEditar(kit: (typeof kits)[number]) {
    setEditandoId(kit.id);
    reset({
      nome: kit.nome,
      descricao: kit.descricao ?? "",
      valorAluguel: kit.valorAluguel / 100,
    });
    setComposicao(
      kit.itens.map((i) => ({
        itemId: i.itemId,
        nome: i.nome,
        quantidade: i.quantidade,
      }))
    );
    setDialogOpen(true);
  }

  function adicionarItem() {
    if (!itemSelecionado) return;
    const id = Number(itemSelecionado);
    const itemInfo = itensDisponiveis.find((i) => i.id === id);
    if (!itemInfo) return;
    const qtd = parseInt(qtdItem) || 1;

    // Se já existe, atualizar quantidade
    const existente = composicao.findIndex((c) => c.itemId === id);
    if (existente >= 0) {
      setComposicao((prev) =>
        prev.map((c, idx) =>
          idx === existente ? { ...c, quantidade: c.quantidade + qtd } : c
        )
      );
    } else {
      setComposicao((prev) => [
        ...prev,
        { itemId: id, nome: itemInfo.nome, quantidade: qtd },
      ]);
    }
    setItemSelecionado("");
    setQtdItem("1");
  }

  function removerItem(itemId: number) {
    setComposicao((prev) => prev.filter((c) => c.itemId !== itemId));
  }

  function confirmarDelete(id: number) {
    if (window.confirm("Deseja remover este kit?")) {
      deleteMutation.mutate({ id });
    }
  }

  function onSubmit(data: KitForm) {
    const payload = {
      nome: data.nome,
      descricao: data.descricao,
      valorAluguel: Math.round(data.valorAluguel * 100),
      itens: composicao.map((c) => ({ itemId: c.itemId, quantidade: c.quantidade })),
    };

    if (editandoId !== null) {
      updateMutation.mutate({ id: editandoId, ...payload });
    } else {
      createMutation.mutate(payload);
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
        <PageHeading icon={<Layers className="h-6 sm:h-7 w-6 sm:w-7 text-primary" />} title="Kits">
          <Button onClick={abrirCriar} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo Kit
          </Button>
        </PageHeading>

        {/* Tabela Desktop */}
        <Card className="hidden sm:block">
          <CardHeader>
            <CardTitle>Catálogo de Kits</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : kits.length === 0 ? (
              <EmptyState icon={Layers} message="Nenhum kit cadastrado ainda." actionLabel="Novo Kit" onAction={abrirCriar} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor Aluguel (R$)</TableHead>
                      <TableHead className="text-center">Itens (tipos)</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kits.map((kit) => (
                      <TableRow key={kit.id} className="transition-colors duration-200 hover:bg-muted/50">
                        <TableCell className="font-medium">{kit.nome}</TableCell>
                        <TableCell className="max-w-xs truncate">{kit.descricao ?? "—"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(kit.valorAluguel)}</TableCell>
                        <TableCell className="text-center">{kit.itens.length}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => abrirEditar(kit)}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => confirmarDelete(kit.id)} className="text-destructive">
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
        <div className="block sm:hidden space-y-2">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : kits.length === 0 ? (
            <EmptyState icon={Layers} message="Nenhum kit cadastrado ainda." actionLabel="Novo Kit" onAction={abrirCriar} />
          ) : (
            kits.map((kit) => (
              <EntityCard
                key={kit.id}
                title={kit.nome}
                subtitle={kit.descricao ? kit.descricao.substring(0, 40) + (kit.descricao.length > 40 ? "..." : "") : "—"}
                badge={<span className="text-xs font-medium bg-primary/10 px-2 py-1 rounded">{kit.itens.length} itens</span>}
                fields={[
                  { icon: DollarSign, label: "Valor", value: formatCurrency(kit.valorAluguel) },
                  { icon: Layers, label: "Itens", value: String(kit.itens.length) },
                ]}
                actions={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => abrirEditar(kit)}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => confirmarDelete(kit.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
            ))
          )}
        </div>
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) fecharDialog(); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {editandoId !== null ? "Editar Kit" : "Novo Kit"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} onKeyDown={dismissKeyboardOnEnter} className="space-y-4">
            {/* Campos básicos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" {...register("nome")} placeholder="Nome do kit" />
                {errors.nome && (
                  <p className="text-sm text-destructive">{errors.nome.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="valorAluguel">Valor Aluguel (R$) *</Label>
                <Input
                  id="valorAluguel"
                  type="number"
                  step={0.01}
                  min={0}
                  {...register("valorAluguel", { valueAsNumber: true })}
                  placeholder="0,00"
                />
                {errors.valorAluguel && (
                  <p className="text-sm text-destructive">{errors.valorAluguel.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                {...register("descricao")}
                placeholder="Descrição do kit"
                rows={3}
              />
            </div>

            {/* Seção composição */}
            <div className="space-y-3 border rounded-md p-3">
              <p className="font-medium text-sm">Composição do Kit</p>

              {/* Seletor de item */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={itemSelecionado} onValueChange={setItemSelecionado}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecionar item..." />
                  </SelectTrigger>
                  <SelectContent>
                    {itensDisponiveis.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={qtdItem}
                  onChange={(e) => setQtdItem(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full sm:w-20"
                  placeholder="Qtd"
                />
                <Button type="button" variant="outline" onClick={adicionarItem} disabled={!itemSelecionado} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Lista de itens adicionados */}
              {composicao.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhum item adicionado ao kit.
                </p>
              ) : (
                <ul className="space-y-1">
                  {composicao.map((c) => (
                    <li
                      key={c.itemId}
                      className="flex items-center justify-between text-sm bg-muted rounded px-3 py-1.5"
                    >
                      <span>
                        <span className="font-medium">{c.nome}</span>
                        <span className="text-muted-foreground ml-2">× {c.quantidade}</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removerItem(c.itemId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={fecharDialog} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : editandoId !== null ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
