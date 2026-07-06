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
import { Warehouse, CalendarIcon } from "lucide-react";
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
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Baixo</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-100 text-green-800">OK</Badge>;
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <Warehouse className="h-6 sm:h-7 w-6 sm:w-7 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Estoque</h1>
          </div>
        </div>

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
                <p className="text-center py-8 text-muted-foreground">Carregando...</p>
              ) : itensComDisponibilidade.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum item cadastrado.</p>
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
                        <TableRow key={item.id}>
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
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : itensComDisponibilidade.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum item cadastrado.</p>
            ) : (
              itensComDisponibilidade.map((item) => (
                <Card key={item.id} className="p-3">
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
                <p className="text-center py-8 text-muted-foreground">Carregando...</p>
              ) : kitsComDisponibilidade.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum kit cadastrado.</p>
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
                        <TableRow key={kit.id}>
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
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : kitsComDisponibilidade.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum kit cadastrado.</p>
            ) : (
              kitsComDisponibilidade.map((kit) => (
                <Card key={kit.id} className="p-3">
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
