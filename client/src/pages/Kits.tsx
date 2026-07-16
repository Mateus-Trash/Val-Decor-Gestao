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
import { Layers, Plus, Pencil, Trash2, X, MoreVertical, DollarSign, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import EntityCard from "@/components/EntityCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/PageHeading";
import { EmptyState } from "@/components/EmptyState";
import { useForm, Controller } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const CATEGORIAS = ["Decoracoes", "Cadeiras e Mesas", "Toalhas"] as const;

const CATEGORIA_LABELS: Record<string, string> = {
  Decoracoes: "Decorações",
  "Cadeiras e Mesas": "Cadeiras e Mesas",
  Toalhas: "Toalhas",
};

const kitSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  categoria: z.enum(CATEGORIAS).default("Decoracoes"),
  valorAluguel: z.number().positive("Valor de aluguel deve ser positivo"),
});

type KitForm = z.infer<typeof kitSchema>;

type ItemComposicao = {
  itemId: number;
  nome: string;
  quantidade: number;
};

const PREDEFINICOES = ["Nenhuma", "Conjuntos", "Pegue e Monte"] as const;

export default function Kits() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [composicao, setComposicao] = useState<ItemComposicao[]>([]);
  const [itemSelecionado, setItemSelecionado] = useState<string>("");
  const [qtdItem, setQtdItem] = useState<string>("1");
  const [predefinicao, setPredefinicao] = useState<string>("Nenhuma");
  const [nomeKit, setNomeKit] = useState<string>("");

  const utils = trpc.useUtils();

  const { data: kits = [], isLoading } = trpc.kits.list.useQuery();
  const { data: itensDisponiveis = [] } = trpc.itens.list.useQuery();

  function toggleCategoria(cat: string) {
    setAbertas((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const kitsFiltrados = (filtroCategoria === "todas" ? kits : kits.filter((k) => (k.categoria ?? "Decoracoes") === filtroCategoria));

  const kitsPorCategoria = CATEGORIAS.map((cat) => ({
    categoria: cat,
    kits: kitsFiltrados.filter((k) => (k.categoria ?? "Decoracoes") === cat),
  })).filter((g) => g.kits.length > 0);

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

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<KitForm>({
    resolver: zodResolver(kitSchema) as any,
  });

  function fecharDialog() {
    setDialogOpen(false);
    setEditandoId(null);
    setComposicao([]);
    setItemSelecionado("");
    setQtdItem("1");
    setPredefinicao("Nenhuma");
    setNomeKit("");
    reset();
  }

  function abrirCriar() {
    setEditandoId(null);
    setComposicao([]);
    setPredefinicao("Nenhuma");
    setNomeKit("");
    reset({ nome: "", descricao: "", categoria: "Decoracoes", valorAluguel: 0 });
    setDialogOpen(true);
  }

  function abrirEditar(kit: (typeof kits)[number]) {
    setEditandoId(kit.id);
    setNomeKit(kit.nome);
    setPredefinicao("Nenhuma");
    reset({
      nome: kit.nome,
      descricao: kit.descricao ?? "",
      categoria: kit.categoria ?? "Decoracoes",
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

  /** Aplica predefinição "Pegue e Monte": adiciona 3 Cilindros + 1 Painel de Ferro + Panos [tema] */
  function aplicarPredefinicao(predef: string, nomeDoKit: string) {
    setPredefinicao(predef);
    if (predef === "Pegue e Monte" && nomeDoKit.trim()) {
      // Extrair tema do nome do kit: "Kit Simples Bob Esponja" → "Bob Esponja"
      const tema = extrairTemaKit(nomeDoKit);
      if (!tema) return;

      const nomePanos = `Panos ${tema}`;
      // Buscar itens existentes que correspondem aos itens padrão
      const cilindro = itensDisponiveis.find((i) => i.nome.toLowerCase().includes("cilindro"));
      const painel = itensDisponiveis.find((i) => i.nome.toLowerCase().includes("painel") && i.nome.toLowerCase().includes("ferro"));
      const panos = itensDisponiveis.find((i) => i.nome.toLowerCase() === nomePanos.toLowerCase());

      const novaComposicao: ItemComposicao[] = [];
      if (cilindro) novaComposicao.push({ itemId: cilindro.id, nome: cilindro.nome, quantidade: 3 });
      if (painel) novaComposicao.push({ itemId: painel.id, nome: painel.nome, quantidade: 1 });
      if (panos) novaComposicao.push({ itemId: panos.id, nome: panos.nome, quantidade: 1 });

      if (novaComposicao.length > 0) {
        setComposicao(novaComposicao);
        toast.info(`Composição auto-preenchida: ${novaComposicao.map((c) => `${c.quantidade}x ${c.nome}`).join(", ")}`);
      } else {
        toast.info(`Itens padrão (Cilindros, Painel de Ferro, Panos ${tema}) serão criados ao salvar.`);
      }
    } else if (predef === "Nenhuma") {
      // Não limpar composição ao mudar para Nenhuma
    }
  }

  /** Extrai o tema do nome do kit: "Kit Simples Bob Esponja" → "Bob Esponja", "Kit Premium Frozen" → "Frozen" */
  function extrairTemaKit(nome: string): string | null {
    const limpo = nome.trim();
    // Remover prefixos comuns: "Kit Simples", "Kit Premium", "Kit "
    const semPrefixo = limpo.replace(/^kit\s+(simples|premium|básico|basico|completo|deluxe|luxo)?\s*/i, "");
    if (semPrefixo.length > 0) return semPrefixo;
    return null;
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
    const tema = predefinicao === "Pegue e Monte" ? extrairTemaKit(data.nome) : null;
    const payload = {
      nome: data.nome,
      descricao: data.descricao,
      categoria: data.categoria,
      valorAluguel: Math.round(data.valorAluguel * 100),
      itens: composicao.map((c) => ({ itemId: c.itemId, quantidade: c.quantidade })),
      predefinicao: predefinicao === "Nenhuma" ? undefined : predefinicao as "Conjuntos" | "Pegue e Monte",
      tema: tema ?? undefined,
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

        {/* Filtro de categoria */}
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {CATEGORIAS.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tabela Desktop com Accordion por Categoria */}
        <div className="hidden sm:block">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : kitsFiltrados.length === 0 ? (
            <EmptyState icon={Layers} message="Nenhum kit cadastrado ainda." actionLabel="Novo Kit" onAction={abrirCriar} />
          ) : (
            <div className="space-y-2">
              {kitsPorCategoria.map((grupo) => (
                <Collapsible key={grupo.categoria} open={abertas.has(grupo.categoria)} onOpenChange={() => toggleCategoria(grupo.categoria)}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${abertas.has(grupo.categoria) ? "rotate-0" : "-rotate-90"}`} />
                      <span className="text-sm font-semibold">{CATEGORIA_LABELS[grupo.categoria] ?? grupo.categoria}</span>
                      <Badge variant="secondary" className="ml-1 text-xs">{grupo.kits.length}</Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="mt-2">
                      <CardContent className="pt-6">
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
                              {grupo.kits.map((kit) => (
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
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </div>

        {/* Cards Mobile com Accordion por Categoria */}
        <div className="block sm:hidden space-y-2">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : kitsFiltrados.length === 0 ? (
            <EmptyState icon={Layers} message="Nenhum kit cadastrado ainda." actionLabel="Novo Kit" onAction={abrirCriar} />
          ) : (
            <div className="space-y-2">
              {kitsPorCategoria.map((grupo) => (
                <Collapsible key={grupo.categoria} open={abertas.has(grupo.categoria)} onOpenChange={() => toggleCategoria(grupo.categoria)}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${abertas.has(grupo.categoria) ? "rotate-0" : "-rotate-90"}`} />
                      <span className="text-sm font-semibold">{CATEGORIA_LABELS[grupo.categoria] ?? grupo.categoria}</span>
                      <Badge variant="secondary" className="ml-1 text-xs">{grupo.kits.length}</Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 mt-2">
                      {grupo.kits.map((kit) => (
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
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
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
                <Label htmlFor="categoria">Categoria *</Label>
                <Controller
                  control={control}
                  name="categoria"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" {...register("nome")} placeholder="Nome do kit" onChange={(e) => { setNomeKit(e.target.value); if (predefinicao === "Pegue e Monte") aplicarPredefinicao("Pegue e Monte", e.target.value); }} />
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

            {/* Predefinição */}
            <div className="space-y-1">
              <Label htmlFor="predefinicao">Predefinição</Label>
              <Select value={predefinicao} onValueChange={(v) => aplicarPredefinicao(v, nomeKit)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINICOES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {predefinicao === "Pegue e Monte" && (
                <p className="text-xs text-muted-foreground">
                  Adiciona automaticamente 3 Cilindros, 1 Painel de Ferro e Panos do tema (extraído do nome do kit). Digite o nome do kit primeiro.
                </p>
              )}
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
