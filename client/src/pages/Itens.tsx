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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { Package, Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const itemSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  valorAluguel: z.number().positive("Valor de aluguel deve ser positivo"),
  custoAquisicao: z.number().optional(),
  quantidadeTotal: z.number().int().positive("Quantidade total deve ser positiva"),
});

type ItemForm = z.infer<typeof itemSchema>;

export default function Itens() {
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: itens = [], isLoading } = trpc.itens.list.useQuery();

  const createMutation = trpc.itens.create.useMutation({
    onSuccess: () => {
      toast.success("Item criado!");
      utils.itens.list.invalidate();
      setDialogOpen(false);
      reset();
    },
    onError: (error) => toast.error(`Erro ao criar item: ${error.message}`),
  });

  const updateMutation = trpc.itens.update.useMutation({
    onSuccess: () => {
      toast.success("Item atualizado!");
      utils.itens.list.invalidate();
      setDialogOpen(false);
      reset();
      setEditandoId(null);
    },
    onError: (error) => toast.error(`Erro ao atualizar item: ${error.message}`),
  });

  const deleteMutation = trpc.itens.delete.useMutation({
    onSuccess: () => {
      toast.success("Item removido!");
      utils.itens.list.invalidate();
    },
    onError: (error) => toast.error(`Erro ao remover item: ${error.message}`),
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
  });

  const itensFiltrados = useMemo(() => {
    if (!busca.trim()) return itens;
    const termo = busca.toLowerCase();
    return itens.filter((i) => i.nome.toLowerCase().includes(termo));
  }, [itens, busca]);

  function abrirCriar() {
    setEditandoId(null);
    reset({ nome: "", descricao: "", valorAluguel: 0, custoAquisicao: 0, quantidadeTotal: 1 });
    setDialogOpen(true);
  }

  function abrirEditar(item: (typeof itens)[number]) {
    setEditandoId(item.id);
    reset({
      nome: item.nome,
      descricao: item.descricao ?? "",
      valorAluguel: item.valorAluguel / 100,
      custoAquisicao: item.custoAquisicao ? item.custoAquisicao / 100 : 0,
      quantidadeTotal: item.quantidadeTotal,
    });
    setDialogOpen(true);
  }

  function confirmarDelete(id: number) {
    if (window.confirm("Deseja remover este item?")) {
      deleteMutation.mutate({ id });
    }
  }

  function onSubmit(data: ItemForm) {
    const payload = {
      nome: data.nome,
      descricao: data.descricao,
      valorAluguel: Math.round(data.valorAluguel * 100),
      custoAquisicao: data.custoAquisicao ? Math.round(data.custoAquisicao * 100) : undefined,
      quantidadeTotal: data.quantidadeTotal,
    };

    if (editandoId !== null) {
      updateMutation.mutate({ id: editandoId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  function getSituacao(disponivel: number) {
    if (disponivel === 0) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="cursor-help">Sem Estoque</Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Nenhuma unidade disponível para novos pedidos</p>
          </TooltipContent>
        </Tooltip>
      );
    } else if (disponivel <= 2) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Baixo</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-100 text-green-800">OK</Badge>;
    }
  }

  function formatCurrency(value: number) {
    return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Itens</h1>
          </div>
          <Button onClick={abrirCriar}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Item
          </Button>
        </div>

        {/* Busca */}
        <Input
          placeholder="Buscar por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-sm"
        />

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Catálogo de Itens</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : itensFiltrados.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum item encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor Aluguel (R$)</TableHead>
                      <TableHead className="text-right">Custo Aquisição (R$)</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Disponível</TableHead>
                      <TableHead className="text-center">Situação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensFiltrados.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.descricao ?? "—"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.valorAluguel)}</TableCell>
                        <TableCell className="text-right">
                          {item.custoAquisicao ? formatCurrency(item.custoAquisicao) : "—"}
                        </TableCell>
                        <TableCell className="text-right">{item.quantidadeTotal}</TableCell>
                        <TableCell className="text-right">{item.quantidadeDisponivel}</TableCell>
                        <TableCell className="text-center">
                          {getSituacao(item.quantidadeDisponivel)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => abrirEditar(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => confirmarDelete(item.id)}
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editandoId !== null ? "Editar Item" : "Novo Item"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...register("nome")} placeholder="Nome do item" />
              {errors.nome && (
                <p className="text-sm text-destructive">{errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                {...register("descricao")}
                placeholder="Descrição detalhada do item"
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

            <div className="space-y-1">
              <Label htmlFor="custoAquisicao">Custo de Aquisição (R$)</Label>
              <Input
                id="custoAquisicao"
                type="number"
                step={0.01}
                min={0}
                {...register("custoAquisicao", { valueAsNumber: true })}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="quantidadeTotal">Quantidade Total *</Label>
              <Input
                id="quantidadeTotal"
                type="number"
                min={1}
                {...register("quantidadeTotal", { valueAsNumber: true })}
                placeholder="1"
              />
              {errors.quantidadeTotal && (
                <p className="text-sm text-destructive">{errors.quantidadeTotal.message}</p>
              )}
            </div>

            {editandoId !== null && (
              <div className="space-y-1">
                <Label>Quantidade Disponível (somente leitura)</Label>
                <Input
                  type="text"
                  disabled
                  value={
                    itens.find((i) => i.id === editandoId)?.quantidadeDisponivel ?? "—"
                  }
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
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
