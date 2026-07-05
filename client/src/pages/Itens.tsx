import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const itemSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  valorAluguel: z.number().int().positive("Valor de aluguel deve ser positivo"),
  custoAquisicao: z.number().int().optional(),
  quantidadeTotal: z.number().int().positive("Quantidade total deve ser positiva"),
  quantidadeDisponivel: z.number().int().positive("Quantidade disponível deve ser positiva"),
}).refine(
  (data) => data.quantidadeDisponivel <= data.quantidadeTotal,
  { message: "Quantidade disponível não pode ser maior que total", path: ["quantidadeDisponivel"] }
);

type ItemInput = z.infer<typeof itemSchema>;

export default function Itens() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: itens = [], isLoading, isError, refetch } = trpc.itens.list.useQuery();
  const createMutation = trpc.itens.create.useMutation({
    onSuccess: () => {
      toast.success("Item criado com sucesso!");
      refetch();
      setOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(`Erro ao criar item: ${error.message}`);
    },
  });

  const updateMutation = trpc.itens.update.useMutation({
    onSuccess: () => {
      toast.success("Item atualizado com sucesso!");
      refetch();
      setOpen(false);
      reset();
      setEditingId(null);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar item: ${error.message}`);
    },
  });

  const deleteMutation = trpc.itens.delete.useMutation({
    onSuccess: () => {
      toast.success("Item deletado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao deletar item: ${error.message}`);
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
  });

  const onSubmit = (data: any) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    reset(item);
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja deletar este item?")) {
      deleteMutation.mutate({ id });
    }
  };

  const formatCurrency = (value: number) => {
    return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Itens</h1>
            <p className="text-muted-foreground mt-2">Gerenciar catálogo de itens para aluguel</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingId(null); reset(); }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Item" : "Novo Item"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Atualize os dados do item" : "Preencha os dados do novo item"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    {...register("nome")}
                    placeholder="Nome do item"
                  />
                  {errors.nome && <p className="text-sm text-red-500">{errors.nome.message}</p>}
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    {...register("descricao")}
                    placeholder="Descrição detalhada do item"
                  />
                </div>

                <div>
                  <Label htmlFor="valorAluguel">Valor de Aluguel (em centavos) *</Label>
                  <Input
                    id="valorAluguel"
                    type="number"
                    {...register("valorAluguel", { valueAsNumber: true })}
                    placeholder="1000"
                  />
                  {errors.valorAluguel && <p className="text-sm text-red-500">{errors.valorAluguel.message}</p>}
                </div>

                <div>
                  <Label htmlFor="custoAquisicao">Custo de Aquisição (em centavos)</Label>
                  <Input
                    id="custoAquisicao"
                    type="number"
                    {...register("custoAquisicao", { valueAsNumber: true })}
                    placeholder="5000"
                  />
                </div>

                <div>
                  <Label htmlFor="quantidadeTotal">Quantidade Total *</Label>
                  <Input
                    id="quantidadeTotal"
                    type="number"
                    {...register("quantidadeTotal", { valueAsNumber: true })}
                    placeholder="10"
                  />
                  {errors.quantidadeTotal && <p className="text-sm text-red-500">{errors.quantidadeTotal.message}</p>}
                </div>

                <div>
                  <Label htmlFor="quantidadeDisponivel">Quantidade Disponível *</Label>
                  <Input
                    id="quantidadeDisponivel"
                    type="number"
                    {...register("quantidadeDisponivel", { valueAsNumber: true })}
                    placeholder="10"
                  />
                  {errors.quantidadeDisponivel && <p className="text-sm text-red-500">{errors.quantidadeDisponivel.message}</p>}
                </div>

                <Button type="submit" className="w-full">
                  {editingId ? "Atualizar" : "Criar"} Item
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Itens</CardTitle>
            <CardDescription>Total: {itens.length} itens</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : isError ? (
              <div className="text-center py-8 text-red-500">
                Erro ao carregar itens. <Button variant="link" onClick={() => refetch()}>Tentar novamente</Button>
              </div>
            ) : itens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum item cadastrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Valor Aluguel</TableHead>
                      <TableHead>Qtd Total</TableHead>
                      <TableHead>Qtd Disponível</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell>{formatCurrency(item.valorAluguel)}</TableCell>
                        <TableCell>{item.quantidadeTotal}</TableCell>
                        <TableCell>{item.quantidadeDisponivel}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
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
      </div>
    </DashboardLayout>
  );
}
