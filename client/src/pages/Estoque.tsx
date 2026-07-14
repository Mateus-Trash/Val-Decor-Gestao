import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { formatarResumoPedido } from "@/lib/pedidoFormat";
import { Warehouse, CalendarIcon, Package, Layers, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/PageHeading";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CATEGORIAS = ["Decoracoes", "Cadeiras e Mesas", "Toalhas"] as const;

const CATEGORIA_LABELS: Record<string, string> = {
  Decoracoes: "Decorações",
  "Cadeiras e Mesas": "Cadeiras e Mesas",
  Toalhas: "Toalhas",
};

export default function Estoque() {
  const [dataConsulta, setDataConsulta] = useState<Date>(new Date());
  const [itensAbertas, setItensAbertas] = useState<Set<string>>(new Set());
  const [kitsAbertas, setKitsAbertas] = useState<Set<string>>(new Set());

  function toggleCategoria(set: Set<string>, cat: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setter(next);
  }

  const { data: itensDisponibilidade = [] } = trpc.itens.getDisponibilidadePorData.useQuery({ data: dataConsulta });
  const { data: kitsDisponibilidade = [] } = trpc.kits.getDisponibilidadePorData.useQuery({ data: dataConsulta });
  const { data: itensList = [], isLoading: itensLoading } = trpc.itens.list.useQuery();
  const { data: kitsList = [], isLoading: kitsLoading } = trpc.kits.list.useQuery();
  const { data: alertasColeta = [] } = trpc.itens.getAlertasColeta.useQuery();

  const diaAnteriorLabel = format(new Date(dataConsulta.getTime() - 86400000), "dd/MM");

  const itensComDisponibilidade = useMemo(
    () =>
      itensList.map((item) => {
        const disp = itensDisponibilidade.find((d) => d.id === item.id);
        return {
          ...item,
          disponivel: disp?.disponivel ?? item.quantidadeTotal,
          avisoRecolherDiaAnterior: disp?.avisoRecolherDiaAnterior ?? null,
        };
      }),
    [itensList, itensDisponibilidade]
  );

  const itensPorCategoria = useMemo(
    () => CATEGORIAS.map((cat) => ({
      categoria: cat,
      itens: itensComDisponibilidade.filter((i) => (i.categoria ?? "Decoracoes") === cat),
    })).filter((g) => g.itens.length > 0),
    [itensComDisponibilidade]
  );

  const kitsComDisponibilidade = useMemo(
    () =>
      kitsList.map((kit) => {
        const disp = kitsDisponibilidade.find((d) => d.id === kit.id);
        return {
          ...kit,
          disponivel: disp?.disponivel ?? 0,
          avisoRecolherDiaAnterior: disp?.avisoRecolherDiaAnterior ?? null,
        };
      }),
    [kitsList, kitsDisponibilidade]
  );

  const kitsPorCategoria = useMemo(
    () => CATEGORIAS.map((cat) => ({
      categoria: cat,
      kits: kitsComDisponibilidade.filter((k) => (k.categoria ?? "Decoracoes") === cat),
    })).filter((g) => g.kits.length > 0),
    [kitsComDisponibilidade]
  );

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
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">Baixo</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">OK</Badge>;
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* Header */}
        <PageHeading icon={<Warehouse className="h-6 sm:h-7 w-6 sm:w-7 text-primary" />} title="Estoque" />

        {/* Date Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Estoque em {format(dataConsulta, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dataConsulta} onSelect={(date) => date && setDataConsulta(date)} locale={ptBR} />
          </PopoverContent>
        </Popover>

        {/* Alertas de coleta atrasada */}
        {alertasColeta.length > 0 && (
          <div className="space-y-2">
            {alertasColeta.map((alerta) => (
              <Card key={alerta.pedidoId} className="border-amber-400 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="pt-4 pb-4 text-sm space-y-1">
                  <p className="font-medium text-amber-900 dark:text-amber-200">
                    ⚠️ Pedido de {formatarResumoPedido(alerta)} entregue há {alerta.diasAtraso} dias e ainda não coletado
                  </p>
                  {alerta.itensAfetados.map((ia) => (
                    <p key={ia.itemId} className="text-amber-800 dark:text-amber-300">
                      Se não for coletado, o estoque de <strong>{ia.nome}</strong> cai para{" "}
                      <strong>{ia.disponivelSeNaoDevolver}</strong> (hoje ainda há {ia.disponivelHoje} disponíveis)
                    </p>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Itens Section */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold mb-3">Itens</h2>
          {itensLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : itensComDisponibilidade.length === 0 ? (
            <EmptyState icon={Package} message="Nenhum item cadastrado." />
          ) : (
            <div className="space-y-2">
              {itensPorCategoria.map((grupo) => (
                <Collapsible key={grupo.categoria} open={itensAbertas.has(grupo.categoria)} onOpenChange={() => toggleCategoria(itensAbertas, grupo.categoria, setItensAbertas)}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${itensAbertas.has(grupo.categoria) ? "rotate-0" : "-rotate-90"}`} />
                      <span className="text-sm font-semibold">{CATEGORIA_LABELS[grupo.categoria] ?? grupo.categoria}</span>
                      <Badge variant="secondary" className="ml-1 text-xs">{grupo.itens.length}</Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2">
                    <Card className="hidden sm:block">
                    <CardContent className="pt-6">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Disponível em {format(dataConsulta, "dd/MM")}</TableHead>
                              <TableHead className="text-center">Situação</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {grupo.itens.map((item) => (
                              <TableRow key={item.id} className="transition-colors duration-200 hover:bg-muted/50">
                                <TableCell className="font-medium">
                                  {item.nome}
                                  {item.avisoRecolherDiaAnterior && (
                                    <p className="text-xs text-amber-700 dark:text-amber-400 font-normal mt-0.5">
                                      ⚠️ Recolher {item.avisoRecolherDiaAnterior} do dia {diaAnteriorLabel} pra suprir hoje
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">{item.quantidadeTotal}</TableCell>
                                <TableCell className="text-right">{item.disponivel}</TableCell>
                                <TableCell className="text-center">{getSituacao(item.disponivel)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Mobile Cards */}
                  <div className="block sm:hidden space-y-3 mt-2">
                    {grupo.itens.map((item) => (
                      <Card key={item.id} className="p-3 transition-colors duration-200 hover:bg-muted/50">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="font-semibold">{item.nome}</p>
                              {item.avisoRecolherDiaAnterior && (
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                  ⚠️ Recolher {item.avisoRecolherDiaAnterior} do dia {diaAnteriorLabel} pra suprir hoje
                                </p>
                              )}
                            </div>
                            <div>{getSituacao(item.disponivel)}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="font-medium">Total:</span> {item.quantidadeTotal}</div>
                            <div><span className="font-medium">Disponível:</span> {item.disponivel}</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </div>

        {/* Kits Section */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold mb-3">Kits</h2>
          {kitsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : kitsComDisponibilidade.length === 0 ? (
            <EmptyState icon={Layers} message="Nenhum kit cadastrado." />
          ) : (
            <div className="space-y-2">
              {kitsPorCategoria.map((grupo) => (
                <Collapsible key={grupo.categoria} open={kitsAbertas.has(grupo.categoria)} onOpenChange={() => toggleCategoria(kitsAbertas, grupo.categoria, setKitsAbertas)}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${kitsAbertas.has(grupo.categoria) ? "rotate-0" : "-rotate-90"}`} />
                      <span className="text-sm font-semibold">{CATEGORIA_LABELS[grupo.categoria] ?? grupo.categoria}</span>
                      <Badge variant="secondary" className="ml-1 text-xs">{grupo.kits.length}</Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2">
                    <Card className="hidden sm:block">
                    <CardContent className="pt-6">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead className="text-right">Disponível em {format(dataConsulta, "dd/MM")}</TableHead>
                              <TableHead className="text-center">Situação</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {grupo.kits.map((kit) => (
                              <TableRow key={kit.id} className="transition-colors duration-200 hover:bg-muted/50">
                                <TableCell className="font-medium">
                                  {kit.nome}
                                  {kit.avisoRecolherDiaAnterior !== null && (
                                    <p className="text-xs text-amber-700 dark:text-amber-400 font-normal mt-0.5">
                                      ⚠️ Recolher kits do dia {diaAnteriorLabel} pra suprir hoje (até {kit.avisoRecolherDiaAnterior} disponíveis com coleta)
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">{kit.disponivel}</TableCell>
                                <TableCell className="text-center">{getSituacao(kit.disponivel)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Mobile Cards */}
                  <div className="block sm:hidden space-y-3 mt-2">
                    {grupo.kits.map((kit) => (
                      <Card key={kit.id} className="p-3 transition-colors duration-200 hover:bg-muted/50">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="font-semibold">{kit.nome}</p>
                              {kit.avisoRecolherDiaAnterior !== null && (
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                  ⚠️ Recolher kits do dia {diaAnteriorLabel} pra suprir hoje (até {kit.avisoRecolherDiaAnterior} disponíveis com coleta)
                                </p>
                              )}
                            </div>
                            <div>{getSituacao(kit.disponivel)}</div>
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Disponível:</span> {kit.disponivel}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
