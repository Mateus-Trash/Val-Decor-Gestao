import { useMemo, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { UserCheck, Plus, Pencil, Trash2, MoreVertical, Mail, Phone, DollarSign, ShoppingCart } from "lucide-react";
import EntityCard from "@/components/EntityCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/PageHeading";
import { EmptyState } from "@/components/EmptyState";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const colaboradorSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
  novaSenha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
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
    reset({ nome: "", email: "", senha: "", novaSenha: "", telefone: "", funcao: "", percentualComissao: 10 });
    setDialogOpen(true);
  }

  function abrirEditar(c: (typeof colaboradores)[number]) {
    setEditandoId(c.id);
    reset({
      nome: c.nome,
      email: c.email ?? "",
      senha: "",
      novaSenha: "",
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
    if (editandoId !== null) {
      updateMutation.mutate({
        id: editandoId,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        funcao: data.funcao,
        percentualComissao: data.percentualComissao ?? 10,
        novaSenha: data.novaSenha || undefined,
      });
    } else {
      createMutation.mutate({
        nome: data.nome,
        email: data.email,
        senha: data.senha || "",
        telefone: data.telefone,
        funcao: data.funcao,
        percentualComissao: data.percentualComissao ?? 10,
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* Header */}
        <PageHeading icon={<UserCheck className="h-6 sm:h-7 w-6 sm:w-7 text-primary" />} title="Colaboradores">
          <Button onClick={abrirCriar} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo Colaborador
          </Button>
        </PageHeading>

        {/* Busca */}
        <Input
          placeholder="Buscar por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full"
        />

        {/* Tabela Desktop */}
        <Card className="hidden sm:block">
          <CardHeader>
            <CardTitle>Lista de Colaboradores</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : colaboradoresFiltrados.length === 0 ? (
              <EmptyState icon={UserCheck} message="Nenhum colaborador cadastrado." actionLabel="Novo Colaborador" onAction={abrirCriar} />
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
                        <TableRow key={c.id} className="transition-colors duration-200 hover:bg-muted/50">
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => abrirEditar(c)}>
                                  <Pencil className="h-4 w-4 mr-2" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => confirmarDelete(c.id)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

        {/* Cards Mobile */}
        <div className="block sm:hidden space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : colaboradoresFiltrados.length === 0 ? (
            <EmptyState icon={UserCheck} message="Nenhum colaborador cadastrado." actionLabel="Novo Colaborador" onAction={abrirCriar} />
          ) : (
            colaboradoresFiltrados.map((c) => {
              const resumo = resumoMap.get(c.id);
              return (
                <EntityCard
                  key={c.id}
                  title={c.nome}
                  subtitle={c.funcao || "—"}
                  badge={<span className="text-xs font-medium bg-primary/10 px-2 py-1 rounded">{c.percentualComissao}%</span>}
                  fields={[
                    { icon: Mail, label: "Email", value: c.email || "—" },
                    { icon: Phone, label: "Tel", value: c.telefone || "—" },
                    { icon: DollarSign, label: "Comissão", value: resumo ? (resumo.totalComissao / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00" },
                    { icon: ShoppingCart, label: "Pedidos", value: String(resumo?.quantidadePedidos ?? 0) },
                  ]}
                  actions={
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => abrirEditar(c)}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => confirmarDelete(c.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }
                />
              );
            })
          )}
        </div>
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {editandoId !== null ? "Editar Colaborador" : "Novo Colaborador"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} onKeyDown={dismissKeyboardOnEnter} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" {...register("nome")} placeholder="Nome completo" />
                {errors.nome && (
                  <p className="text-sm text-destructive">{errors.nome.message}</p>
                )}
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

              <div className="space-y-1">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...register("email")} placeholder="email@exemplo.com" />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" {...register("telefone")} placeholder="(11) 99999-9999" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="funcao">Função</Label>
              <Input id="funcao" {...register("funcao")} placeholder="Ex: Entregador, Gerente" />
            </div>

            {editandoId === null ? (
              <div className="space-y-1">
                <Label htmlFor="senha">Senha *</Label>
                <Input id="senha" type="password" {...register("senha")} placeholder="Mínimo 6 caracteres" />
                {errors.senha && (
                  <p className="text-sm text-destructive">{errors.senha.message}</p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="novaSenha">Nova senha (deixe em branco para manter a atual)</Label>
                <Input id="novaSenha" type="password" {...register("novaSenha")} placeholder="Nova senha" />
                {errors.novaSenha && (
                  <p className="text-sm text-destructive">{errors.novaSenha.message}</p>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
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
