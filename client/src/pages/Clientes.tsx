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

const clienteSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  contato: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  observacoesInternas: z.string().optional(),
});

type ClienteInput = z.infer<typeof clienteSchema>;

export default function Clientes() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: clientes = [], isLoading, isError, refetch } = trpc.clientes.list.useQuery();
  const createMutation = trpc.clientes.create.useMutation({
    onSuccess: () => {
      toast.success("Cliente criado com sucesso!");
      refetch();
      setOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(`Erro ao criar cliente: ${error.message}`);
    },
  });

  const updateMutation = trpc.clientes.update.useMutation({
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso!");
      refetch();
      setOpen(false);
      reset();
      setEditingId(null);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar cliente: ${error.message}`);
    },
  });

  const deleteMutation = trpc.clientes.delete.useMutation({
    onSuccess: () => {
      toast.success("Cliente deletado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao deletar cliente: ${error.message}`);
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
  });

  const onSubmit = (data: any) => {
    const cleanData = {
      ...data,
      contato: data.contato || undefined,
      email: data.email || undefined,
      observacoesInternas: data.observacoesInternas || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...cleanData });
    } else {
      createMutation.mutate(cleanData);
    }
  };

  const handleEdit = (cliente: any) => {
    setEditingId(cliente.id);
    reset(cliente);
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja deletar este cliente?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground mt-2">Gerenciar clientes do sistema</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingId(null); reset(); }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Atualize os dados do cliente" : "Preencha os dados do novo cliente"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    {...register("nome")}
                    placeholder="Nome do cliente"
                  />
                  {errors.nome && <p className="text-sm text-red-500">{errors.nome.message}</p>}
                </div>

                <div>
                  <Label htmlFor="contato">Contato</Label>
                  <Input
                    id="contato"
                    {...register("contato")}
                    placeholder="Telefone ou WhatsApp"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações Internas</Label>
                  <Textarea
                    id="observacoes"
                    {...register("observacoesInternas")}
                    placeholder="Notas internas sobre o cliente"
                  />
                </div>

                <Button type="submit" className="w-full">
                  {editingId ? "Atualizar" : "Criar"} Cliente
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>Total: {clientes.length} clientes</CardDescription>
          </CardHeader>
                      <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : isError ? (
              <div className="text-center py-8 text-red-500">
                Erro ao carregar clientes. <Button variant="link" onClick={() => refetch()}>Tentar novamente</Button>
              </div>
            ) : clientes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cliente cadastrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.map((cliente: any) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium">{cliente.nome}</TableCell>
                        <TableCell>{cliente.contato || "-"}</TableCell>
                        <TableCell>{cliente.email || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {cliente.observacoesInternas || "-"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(cliente)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(cliente.id)}
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
