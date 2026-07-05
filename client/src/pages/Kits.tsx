import { useState } from "react";
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
import { Layers, Plus, Pencil, Trash2, X } from "lucide-react";
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
  const [qtdItem, setQtdItem] = useState<number>(1);

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
    setQtdItem(1);
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

    // Se já existe, atualizar quantidade
    const existente = composicao.findIndex((c) => c.itemId === id);
    if (existente >= 0) {
      setComposicao((prev) =>
        prev.map((c, idx) =>
          idx === existente ? { ...c, quantidade: c.quantidade + qtdItem } : c
        )
      );
    } else {
      setComposicao((prev) => [
        ...prev,
        { itemId: id, nome: itemInfo.nome, quantidade: qtdItem },
      ]);
    }
    setItemSelecionado("");
    setQtdItem(1);
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Kits</h1>
          </div>
          <Button onClick={abrirCriar}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Kit
          </Button>
        </div>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Catálogo de Kits</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : kits.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum kit cadastrado.</p>
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
                      <TableRow key={kit.id}>
                        <TableCell className="font-medium">{kit.nome}</TableCell>
                        <TableCell className="max-w-xs truncate">{kit.descricao ?? "—"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(kit.valorAluguel)}</TableCell>
                        <TableCell className="text-center">{kit.itens.length}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => abrirEditar(kit)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => confirmarDelete(kit.id)}
                            >
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editandoId !== null ? "Editar Kit" : "Novo Kit"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Campos básicos */}
            <div className="space-y-1">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...register("nome")} placeholder="Nome do kit" />
              {errors.nome && (
                <p className="text-sm text-destructive">{errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                {...register("descricao")}
                placeholder="Descrição do kit"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="valorAluguel">Valor de Aluguel (R$) *</Label>
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

            {/* Seção composição */}
            <div className="space-y-3 border rounded-md p-3">
              <p className="font-medium text-sm">Composição do Kit</p>

              {/* Seletor de item */}
              <div className="flex gap-2">
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
                  onChange={(e) => setQtdItem(Math.max(1, Number(e.target.value)))}
                  className="w-20"
                  placeholder="Qtd"
                />
                <Button type="button" variant="outline" onClick={adicionarItem} disabled={!itemSelecionado}>
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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={fecharDialog}>
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
