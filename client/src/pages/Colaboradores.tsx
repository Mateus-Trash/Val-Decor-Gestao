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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { UserCheck, Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const colaboradorSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  funcao: z.string().optional(),
  percentualComissao: z.number().int().min(0).max(100).optional(),
});

type ColaboradorForm = z.infer<typeof colaboradorSchema>;

export default function Colaboradores() {
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: colaboradores = [], isLoading } = trpc.colaboradores.list.useQuery();
  const { data: resumos = [] } = trpc.colaboradores.getResumoComissoes.useQuery();

  const createMutation = trpc.colaboradores.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador criado!");
      utils.colaboradores.list.invalidate();
      setDialogOpen(false);
      reset();
    },
    onError: () => toast.error("Erro ao criar colaborador"),
  });

  const updateMutation = trpc.colaboradores.update.useMutation({
    onSuccess: () => {
      toast.success("Colaborador atualizado!");
      utils.colaboradores.list.invalidate();
      setDialogOpen(false);
      reset();
      setEditandoId(null);
    },
    onError: () => toast.error("Erro ao atualizar colaborador"),
  });

  const deleteMutation = trpc.colaboradores.delete.useMutation({
    onSuccess: () => {
      toast.success("Colaborador removido!");
      utils.colaboradores.list.invalidate();
      utils.colaboradores.getResumoComissoes.invalidate();
    },
    onError: () => toast.error("Erro ao remover colaborador"),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ColaboradorForm>({
    resolver: zodResolver(colaboradorSchema),
  });

  const colaboradoresFiltrados = useMemo(() => {
    if (!busca.trim()) return colaboradores;
    const termo = busca.toLowerCase();
    return colaboradores.filter((c) => c.nome.toLowerCase().includes(termo));
  }, [colaboradores, busca]);

  const resumoMap = useMemo(() => {
    const map = new Map<number, { totalComissao: number; quantidadePedidos: number }>();
    for (const r of resumos) {
      map.set(r.colaboradorId, {
        totalComissao: Number(r.totalComissao) || 0,
        quantidadePedidos: Number(r.quantidadePedidos) || 0,
      });
    }
    return map;
  }, [resumos]);

  function abrirCriar() {
    setEditandoId(null);
    reset({ nome: "", email: "", telefone: "", funcao: "", percentualComissao: 10 });
    setDialogOpen(true);
  }

  function abrirEditar(c: (typeof colaboradores)[number]) {
    setEditandoId(c.id);
    reset({
      nome: c.nome,
      email: c.email ?? "",
      telefone: c.telefone ?? "",
      funcao: c.funcao ?? "",
      percentualComissao: c.percentualComissao,
    });
    setDialogOpen(true);
  }

  function confirmarDelete(id: number) {
    if (window.confirm("Deseja remover este colaborador?")) {
      deleteMutation.mutate({ id });
    }
  }

  function onSubmit(data: ColaboradorForm) {
    const payload = {
      ...data,
      email: data.email || undefined,
      percentualComissao: data.percentualComissao ?? 10,
    };
    if (editandoId !== null) {
      updateMutation.mutate({ id: editandoId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCheck className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Colaboradores</h1>
          </div>
          <Button onClick={abrirCriar}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Colaborador
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
            <CardTitle>Lista de Colaboradores</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : colaboradoresFiltrados.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum colaborador encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="text-right">Comissão (%)</TableHead>
                      <TableHead className="text-right">Comissão Total Acumulada (R$)</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {colaboradoresFiltrados.map((c) => {
                      const resumo = resumoMap.get(c.id);
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.nome}</TableCell>
                          <TableCell>{c.funcao ?? "—"}</TableCell>
                          <TableCell>{c.email || "—"}</TableCell>
                          <TableCell>{c.telefone ?? "—"}</TableCell>
                          <TableCell className="text-right">{c.percentualComissao}%</TableCell>
                          <TableCell className="text-right">
                            {resumo
                              ? (resumo.totalComissao / 100).toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })
                              : "R$ 0,00"}
                          </TableCell>
                          <TableCell className="text-right">{resumo?.quantidadePedidos ?? 0}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => abrirEditar(c)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => confirmarDelete(c.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editandoId !== null ? "Editar Colaborador" : "Novo Colaborador"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...register("nome")} placeholder="Nome completo" />
              {errors.nome && (
                <p className="text-sm text-destructive">{errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="email@exemplo.com" />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" {...register("telefone")} placeholder="(11) 99999-9999" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="funcao">Função</Label>
              <Input id="funcao" {...register("funcao")} placeholder="Ex: Entregador, Gerente" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="percentualComissao">Comissão (%)</Label>
              <Input
                id="percentualComissao"
                type="number"
                min={0}
                max={100}
                {...register("percentualComissao", { valueAsNumber: true })}
                placeholder="10"
              />
              {errors.percentualComissao && (
                <p className="text-sm text-destructive">{errors.percentualComissao.message}</p>
              )}
            </div>

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
