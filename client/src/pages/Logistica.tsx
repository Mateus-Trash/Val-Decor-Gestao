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
import { Truck, CalendarIcon, PackageCheck, PackageOpen, MapPin, ChevronsRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/PageHeading";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Pedido = {
  id: number;
  nomeCliente: string;
  ruaEntrega: string;
  bairroEntrega: string;
  numeroEntrega: string;
  dataEntrega: Date | string;
  coletaAdiadaPara?: Date | string | null;
  status: string;
  observacoes?: string | null;
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

function groupByBairro(pedidos: Pedido[]): Record<string, Pedido[]> {
  return pedidos.reduce(
    (acc, p) => {
      const bairro = p.bairroEntrega || "Sem Bairro";
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
    <Card>
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
                    <TableHead>Cliente</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead className="text-center">Status</TableHead>
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
                            aria-label={`Selecionar ${p.nomeCliente}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{p.nomeCliente}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.ruaEntrega}, {p.numeroEntrega}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-xs border ${statusColors[p.status] ?? ""}`}>
                          {statusLabels[p.status] ?? p.status}
                        </Badge>
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
                            aria-label={`Selecionar ${p.nomeCliente}`}
                            className="shrink-0"
                          />
                        )}
                        <span className="font-medium text-sm truncate">{p.nomeCliente}</span>
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
                  <Button
                    className="w-full gap-2"
                    variant="outline"
                    onClick={handlePostergar}
                    disabled={postergarMutation.isPending}
                  >
                    <ChevronsRight className="h-4 w-4" />
                    Postergar {selectedColetas.size} selecionada(s) para amanhã
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
