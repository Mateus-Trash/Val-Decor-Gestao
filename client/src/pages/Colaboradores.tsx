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
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const colaboradorSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  telefone: z.string().optional(),
  funcao: z.string().optional(),
  percentualComissao: z.number().int().min(0).max(100).optional(),
}).transform(data => ({
  ...data,
  percentualComissao: Number.isNaN(data.percentualComissao) ? undefined : data.percentualComissao,
}));

type ColaboradorInput = z.infer<typeof colaboradorSchema>;

export default function Colaboradores() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: colaboradores = [], isLoading, isError, refetch } = trpc.colaboradores.list.useQuery();
  const createMutation = trpc.colaboradores.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador criado com sucesso!");
      refetch();
      setOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(`Erro ao criar colaborador: ${error.message}`);
    },
  });

  const updateMutation = trpc.colaboradores.update.useMutation({
    onSuccess: () => {
      toast.success("Colaborador atualizado com sucesso!");
      refetch();
      setOpen(false);
      reset();
      setEditingId(null);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar colaborador: ${error.message}`);
    },
  });

  const deleteMutation = trpc.colaboradores.delete.useMutation({
    onSuccess: () => {
      toast.success("Colaborador deletado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao deletar colaborador: ${error.message}`);
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
    resolver: zodResolver(colaboradorSchema),
  });

  const onSubmit = (data: any) => {
    const cleanData = {
      ...data,
      percentualComissao: data.percentualComissao || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...cleanData });
    } else {
      createMutation.mutate(cleanData);
    }
  };

  const handleEdit = (colaborador: any) => {
    setEditingId(colaborador.id);
    reset(colaborador);
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja deletar este colaborador?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Colaboradores</h1>
            <p className="text-muted-foreground mt-2">Gerenciar equipe de trabalho</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingId(null); reset(); }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Colaborador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Atualize os dados do colaborador" : "Preencha os dados do novo colaborador"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    {...register("nome")}
                    placeholder="Nome completo"
                  />
                  {errors.nome && <p className="text-sm text-red-500">Nome é obrigatório</p>}
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="email@example.com"
                  />
                  {errors.email && <p className="text-sm text-red-500">Email inválido</p>}
                </div>

                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    {...register("telefone")}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <Label htmlFor="funcao">Função</Label>
                  <Input
                    id="funcao"
                    {...register("funcao")}
                    placeholder="Ex: Entregador, Gerente"
                  />
                </div>

                <div>
                  <Label htmlFor="percentualComissao">Percentual de Comissão (%)</Label>
                  <Input
                    id="percentualComissao"
                    type="number"
                    min="0"
                    max="100"
                    {...register("percentualComissao", { valueAsNumber: true })}
                    placeholder="10"
                  />
                  {errors.percentualComissao && <p className="text-sm text-red-500">Percentual de comissão inválido</p>}
                </div>

                <Button type="submit" className="w-full">
                  {editingId ? "Atualizar" : "Criar"} Colaborador
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Colaboradores</CardTitle>
            <CardDescription>Total: {colaboradores.length} colaboradores</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : isError ? (
              <div className="text-center py-8 text-red-500">
                Erro ao carregar colaboradores. <Button variant="link" onClick={() => refetch()}>Tentar novamente</Button>
              </div>
            ) : colaboradores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum colaborador cadastrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Comissão (%)</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {colaboradores.map((colaborador: any) => (
                      <TableRow key={colaborador.id}>
                        <TableCell className="font-medium">{colaborador.nome}</TableCell>
                        <TableCell>{colaborador.email}</TableCell>
                        <TableCell>{colaborador.telefone || "-"}</TableCell>
                        <TableCell>{colaborador.funcao || "-"}</TableCell>
                        <TableCell>{colaborador.percentualComissao}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(colaborador)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(colaborador.id)}
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
