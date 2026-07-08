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
import { Warehouse, CalendarIcon, Package, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/PageHeading";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Estoque() {
  const [dataConsulta, setDataConsulta] = useState<Date>(new Date());

  const { data: itensDisponibilidade = [] } = trpc.itens.getDisponibilidadePorData.useQuery({ data: dataConsulta });
  const { data: kitsDisponibilidade = [] } = trpc.kits.getDisponibilidadePorData.useQuery({ data: dataConsulta });
  const { data: itensList = [], isLoading: itensLoading } = trpc.itens.list.useQuery();
  const { data: kitsList = [], isLoading: kitsLoading } = trpc.kits.list.useQuery();

  const itensComDisponibilidade = useMemo(
    () =>
      itensList.map((item) => {
        const disp = itensDisponibilidade.find((d) => d.id === item.id);
        return {
          ...item,
          disponivel: disp?.disponivel ?? item.quantidadeTotal,
        };
      }),
    [itensList, itensDisponibilidade]
  );

  const kitsComDisponibilidade = useMemo(
    () =>
      kitsList.map((kit) => {
        const disp = kitsDisponibilidade.find((d) => d.id === kit.id);
        return {
          ...kit,
          disponivel: disp?.disponivel ?? 0,
        };
      }),
    [kitsList, kitsDisponibilidade]
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

        {/* Itens Section */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold mb-3">Itens</h2>
          <Card className="hidden sm:block">
            <CardContent className="pt-6">
              {itensLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : itensComDisponibilidade.length === 0 ? (
                <EmptyState icon={Package} message="Nenhum item cadastrado." />
              ) : (
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
                      {itensComDisponibilidade.map((item) => (
                        <TableRow key={item.id} className="transition-colors duration-200 hover:bg-muted/50">
                          <TableCell className="font-medium">{item.nome}</TableCell>
                          <TableCell className="text-right">{item.quantidadeTotal}</TableCell>
                          <TableCell className="text-right">{item.disponivel}</TableCell>
                          <TableCell className="text-center">{getSituacao(item.disponivel)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile Cards */}
          <div className="block sm:hidden space-y-3">
            {itensLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : itensComDisponibilidade.length === 0 ? (
              <EmptyState icon={Package} message="Nenhum item cadastrado." />
            ) : (
              itensComDisponibilidade.map((item) => (
                <Card key={item.id} className="p-3 transition-colors duration-200 hover:bg-muted/50">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-semibold">{item.nome}</p>
                      <div>{getSituacao(item.disponivel)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="font-medium">Total:</span> {item.quantidadeTotal}</div>
                      <div><span className="font-medium">Disponível:</span> {item.disponivel}</div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Kits Section */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold mb-3">Kits</h2>
          <Card className="hidden sm:block">
            <CardContent className="pt-6">
              {kitsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : kitsComDisponibilidade.length === 0 ? (
                <EmptyState icon={Layers} message="Nenhum kit cadastrado." />
              ) : (
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
                      {kitsComDisponibilidade.map((kit) => (
                        <TableRow key={kit.id} className="transition-colors duration-200 hover:bg-muted/50">
                          <TableCell className="font-medium">{kit.nome}</TableCell>
                          <TableCell className="text-right">{kit.disponivel}</TableCell>
                          <TableCell className="text-center">{getSituacao(kit.disponivel)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile Cards */}
          <div className="block sm:hidden space-y-3">
            {kitsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : kitsComDisponibilidade.length === 0 ? (
              <EmptyState icon={Layers} message="Nenhum kit cadastrado." />
            ) : (
              kitsComDisponibilidade.map((kit) => (
                <Card key={kit.id} className="p-3 transition-colors duration-200 hover:bg-muted/50">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-semibold">{kit.nome}</p>
                      <div>{getSituacao(kit.disponivel)}</div>
                    </div>
                    <div className="text-xs">
                      <span className="font-medium">Disponível:</span> {kit.disponivel}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
