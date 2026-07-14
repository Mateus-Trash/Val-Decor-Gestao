import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Truck, CalendarIcon, PackageCheck, PackageOpen, MapPin, ChevronsRight, CheckCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/PageHeading";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { formatarResumoPedido } from "@/lib/pedidoFormat";

type Pedido = {
  id: number;
  nomeCliente: string;
  nomeColaborador: string;
  ruaEntrega: string;
  bairroEntrega: string;
  numeroEntrega: string;
  data: Date | string;
  coletaAdiadaPara?: Date | string | null;
  status: string;
  observacoes?: string | null;
  composicaoItens?: { nome: string; quantidade: number }[];
  composicaoKits?: { nome: string; quantidade: number }[];
};

const statusColors: Record<string, string> = {
  Pendente: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  Confirmado: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  EntregueNaoPago: "bg-red-200 text-red-900 border-red-400 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  EntreguePago: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  Concluido: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
};

const statusLabels: Record<string, string> = {
  Pendente: "Pendente",
  Confirmado: "Confirmado",
  EntregueNaoPago: "Entregue (Não Pago)",
  EntreguePago: "Entregue (Pago)",
  Concluido: "Concluído",
};

// ─── Detecção de bairros parecidos (erro de digitação/acentuação) ──────────

const LIMIAR_SIMILARIDADE_BAIRRO = 0.4; // 0 a 1 — bem baixo de propósito: abrangente, agrupa mesmo nomes que não se parecem muito

function normalizarBairro(bairro: string): string {
  return bairro
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function distanciaLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function similaridadeBairro(a: string, b: string): number {
  const na = normalizarBairro(a);
  const nb = normalizarBairro(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - distanciaLevenshtein(na, nb) / maxLen;
}

/**
 * Recebe os nomes de bairro "crus" (como estão no pedido) e devolve um mapa
 * de cada nome pra seu nome "canônico" de exibição: o nome mais frequente
 * dentro do grupo de nomes parecidos (empate = ordem alfabética).
 * "Sem Bairro" nunca é agrupado com outro nome.
 */
function mapearBairrosParaCanonico(nomesBrutos: string[]): Map<string, string> {
  const contagem = new Map<string, number>();
  nomesBrutos.forEach((n) => contagem.set(n, (contagem.get(n) || 0) + 1));

  const distintos = Array.from(contagem.keys());
  const pai: Record<string, string> = {};
  distintos.forEach((n) => (pai[n] = n));

  function encontrar(n: string): string {
    if (pai[n] !== n) pai[n] = encontrar(pai[n]);
    return pai[n];
  }
  function unir(a: string, b: string) {
    const ra = encontrar(a);
    const rb = encontrar(b);
    if (ra !== rb) pai[ra] = rb;
  }

  for (let i = 0; i < distintos.length; i++) {
    for (let j = i + 1; j < distintos.length; j++) {
      const a = distintos[i];
      const b = distintos[j];
      if (a === "Sem Bairro" || b === "Sem Bairro") continue;
      if (similaridadeBairro(a, b) >= LIMIAR_SIMILARIDADE_BAIRRO) {
        unir(a, b);
      }
    }
  }

  const clusters = new Map<string, string[]>();
  distintos.forEach((n) => {
    const raiz = encontrar(n);
    if (!clusters.has(raiz)) clusters.set(raiz, []);
    clusters.get(raiz)!.push(n);
  });

  const resultado = new Map<string, string>();
  clusters.forEach((membros) => {
    const vencedor = [...membros].sort((a, b) => {
      const diff = (contagem.get(b) || 0) - (contagem.get(a) || 0);
      return diff !== 0 ? diff : a.localeCompare(b);
    })[0];
    membros.forEach((m) => resultado.set(m, vencedor));
  });

  return resultado;
}

function groupByBairro(pedidos: Pedido[]): Record<string, Pedido[]> {
  const nomesBrutos = pedidos.map((p) => p.bairroEntrega || "Sem Bairro");
  const canonico = mapearBairrosParaCanonico(nomesBrutos);

  return pedidos.reduce(
    (acc, p) => {
      const bruto = p.bairroEntrega || "Sem Bairro";
      const bairro = canonico.get(bruto) ?? bruto;
      if (!acc[bairro]) acc[bairro] = [];
      acc[bairro].push(p);
      return acc;
    },
    {} as Record<string, Pedido[]>
  );
}

// ─── Grupo Desktop (com checkboxes) ─────────────────────────────────────────

function GrupoDesktop({
  pedidos,
  titulo,
  icone,
  showCheckboxes,
  selectedIds,
  onToggle,
  onToggleAll,
}: {
  pedidos: Pedido[];
  titulo: string;
  icone: React.ReactNode;
  showCheckboxes?: boolean;
  selectedIds?: Set<number>;
  onToggle?: (id: number) => void;
  onToggleAll?: (ids: number[], checked: boolean) => void;
}) {
  const grupos = useMemo(() => groupByBairro(pedidos), [pedidos]);
  const bairros = Object.keys(grupos).sort();
  const allIds = pedidos.map((p) => p.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds?.has(id));

  return (
    <Card className="gap-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {icone}
          {titulo}
          <Badge variant="secondary" className="ml-1">
            {pedidos.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {pedidos.length === 0 ? (
          <EmptyState icon={Truck} message="Nenhum compromisso para este dia." />
        ) : (
          bairros.map((bairro, idx) => (
            <div key={bairro}>
              {idx > 0 && <Separator className="my-3" />}
              <div className="flex items-center gap-1 mb-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {bairro}
                </span>
                <Badge variant="outline" className="ml-1 text-xs">
                  {grupos[bairro].length}
                </Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    {showCheckboxes && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(checked) =>
                            onToggleAll?.(allIds, !!checked)
                          }
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                    )}
                    <TableHead>Conteúdo do Aluguel</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Composição</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupos[bairro].map((p) => (
                    <TableRow key={p.id} className={`transition-colors duration-200 hover:bg-muted/50 ${selectedIds?.has(p.id) ? "bg-muted/40" : ""}`}>
                      {showCheckboxes && (
                        <TableCell>
                          <Checkbox
                            checked={selectedIds?.has(p.id) ?? false}
                            onCheckedChange={() => onToggle?.(p.id)}
                            aria-label={`Selecionar ${formatarResumoPedido(p)}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{formatarResumoPedido(p)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.ruaEntrega}, {p.numeroEntrega}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-xs border ${statusColors[p.status] ?? ""}`}>
                          {statusLabels[p.status] ?? p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {[...(p.composicaoItens ?? []), ...(p.composicaoKits ?? [])]
                          .map((c) => `${c.nome} x${c.quantidade}`)
                          .join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {p.observacoes ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ─── Grupo Mobile (com checkboxes) ──────────────────────────────────────────

function GrupoMobile({
  pedidos,
  titulo,
  icone,
  showCheckboxes,
  selectedIds,
  onToggle,
}: {
  pedidos: Pedido[];
  titulo: string;
  icone: React.ReactNode;
  showCheckboxes?: boolean;
  selectedIds?: Set<number>;
  onToggle?: (id: number) => void;
}) {
  const grupos = useMemo(() => groupByBairro(pedidos), [pedidos]);
  const bairros = Object.keys(grupos).sort();

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icone}
        <h2 className="text-base font-semibold">{titulo}</h2>
        <Badge variant="secondary">{pedidos.length}</Badge>
      </div>
      {pedidos.length === 0 ? (
        <EmptyState icon={Truck} message="Nenhum compromisso para este dia." />
      ) : (
        bairros.map((bairro) => (
          <div key={bairro} className="mb-4">
            <div className="flex items-center gap-1 mb-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {bairro}
              </span>
              <Badge variant="outline" className="ml-1 text-xs">
                {grupos[bairro].length}
              </Badge>
            </div>
            <div className="space-y-2">
              {grupos[bairro].map((p) => (
                <Card
                  key={p.id}
                  className={`border shadow-sm transition-colors duration-200 hover:bg-muted/50 ${selectedIds?.has(p.id) ? "border-primary bg-primary/5" : ""}`}
                >
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {showCheckboxes && (
                          <Checkbox
                            checked={selectedIds?.has(p.id) ?? false}
                            onCheckedChange={() => onToggle?.(p.id)}
                            aria-label={`Selecionar ${formatarResumoPedido(p)}`}
                            className="shrink-0"
                          />
                        )}
                        <span className="font-medium text-sm truncate">{formatarResumoPedido(p)}</span>
                      </div>
                      <Badge
                        className={`text-xs border shrink-0 ${statusColors[p.status] ?? ""}`}
                      >
                        {statusLabels[p.status] ?? p.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.ruaEntrega}, {p.numeroEntrega} — {p.bairroEntrega}
                    </p>
                    {((p.composicaoItens?.length ?? 0) > 0 || (p.composicaoKits?.length ?? 0) > 0) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {[...(p.composicaoItens ?? []), ...(p.composicaoKits ?? [])]
                          .map((c) => `${c.nome} x${c.quantidade}`)
                          .join(", ")}
                      </p>
                    )}
                    {p.observacoes && (
                      <p className="text-xs text-muted-foreground italic">{p.observacoes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Logistica() {
  const [dataConsulta, setDataConsulta] = useState<Date>(new Date());
  const [selectedColetas, setSelectedColetas] = useState<Set<number>>(new Set());

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.pedidos.listByDataLogistica.useQuery({
    data: dataConsulta,
  });

  // Clear selections whenever the consulted date changes
  useEffect(() => {
    setSelectedColetas(new Set());
  }, [dataConsulta]);

  const postergarMutation = trpc.pedidos.postergarColeta.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.updated} coleta(s) postergada(s) para amanhã`);
      setSelectedColetas(new Set());
      utils.pedidos.listByDataLogistica.invalidate();
    },
    onError: (err) => {
      toast.error(`Erro ao postergar: ${err.message}`);
    },
  });

  const entregas: Pedido[] = (data?.entregas ?? []) as Pedido[];
  const coletas: Pedido[] = (data?.coletas ?? []) as Pedido[];
  const totalDia = entregas.length + coletas.length;

  function toggleColeta(id: number) {
    setSelectedColetas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllColetas(ids: number[], checked: boolean) {
    setSelectedColetas((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  function handlePostergar() {
    if (selectedColetas.size === 0) return;
    postergarMutation.mutate({ pedidoIds: Array.from(selectedColetas) });
  }

  const marcarRecolhidoMutation = trpc.pedidos.updateStatus.useMutation();

  async function handleMarcarRecolhido() {
    if (selectedColetas.size === 0) return;
    const ids = Array.from(selectedColetas);
    try {
      await Promise.all(
        ids.map((id) => marcarRecolhidoMutation.mutateAsync({ id, status: "Concluido" }))
      );
      toast.success(`${ids.length} coleta(s) marcada(s) como recolhida(s)`);
      setSelectedColetas(new Set());
      utils.pedidos.listByDataLogistica.invalidate();
    } catch (err) {
      toast.error(`Erro ao marcar como recolhido: ${(err as Error).message}`);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* Header */}
        <PageHeading icon={<Truck className="h-6 sm:h-7 w-6 sm:w-7 text-primary" />} title="Logística">
          {!isLoading && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {totalDia} compromisso{totalDia !== 1 ? "s" : ""} em{" "}
              {format(dataConsulta, "dd/MM")}
            </Badge>
          )}
        </PageHeading>

        {/* Date Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dataConsulta, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dataConsulta}
              onSelect={(date) => {
                if (date) {
                  setDataConsulta(date);
                  setSelectedColetas(new Set());
                }
              }}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden sm:block space-y-4">
              <GrupoDesktop
                pedidos={entregas}
                titulo="Entregas do Dia"
                icone={<PackageOpen className="h-4 w-4 text-blue-600" />}
              />

              {/* Coletas com toolbar de postergar */}
              <div className="space-y-2">
                {selectedColetas.size > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                    <span className="text-sm text-muted-foreground">
                      {selectedColetas.size} coleta(s) selecionada(s)
                    </span>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleMarcarRecolhido}
                      disabled={marcarRecolhidoMutation.isPending}
                      className="gap-1.5"
                    >
                      <CheckCheck className="h-4 w-4" />
                      Marcar como recolhido
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePostergar}
                      disabled={postergarMutation.isPending}
                      className="gap-1.5"
                    >
                      <ChevronsRight className="h-4 w-4" />
                      Postergar selecionadas para amanhã
                    </Button>
                  </div>
                )}
                <GrupoDesktop
                  pedidos={coletas}
                  titulo="Coletas do Dia"
                  icone={<PackageCheck className="h-4 w-4 text-green-600" />}
                  showCheckboxes
                  selectedIds={selectedColetas}
                  onToggle={toggleColeta}
                  onToggleAll={toggleAllColetas}
                />
              </div>
            </div>

            {/* Mobile */}
            <div className="block sm:hidden space-y-6">
              <GrupoMobile
                pedidos={entregas}
                titulo="Entregas do Dia"
                icone={<PackageOpen className="h-4 w-4 text-blue-600" />}
              />
              <Separator />

              {/* Coletas mobile com botão de postergar */}
              <div className="space-y-3">
                <GrupoMobile
                  pedidos={coletas}
                  titulo="Coletas do Dia"
                  icone={<PackageCheck className="h-4 w-4 text-green-600" />}
                  showCheckboxes
                  selectedIds={selectedColetas}
                  onToggle={toggleColeta}
                />
                {selectedColetas.size > 0 && (
                  <div className="space-y-2">
                    <Button
                      className="w-full gap-2"
                      variant="default"
                      onClick={handleMarcarRecolhido}
                      disabled={marcarRecolhidoMutation.isPending}
                    >
                      <CheckCheck className="h-4 w-4" />
                      Marcar {selectedColetas.size} como recolhido
                    </Button>
                    <Button
                      className="w-full gap-2"
                      variant="outline"
                      onClick={handlePostergar}
                      disabled={postergarMutation.isPending}
                    >
                      <ChevronsRight className="h-4 w-4" />
                      Postergar {selectedColetas.size} selecionada(s) para amanhã
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
