import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Truck, CalendarIcon, PackageCheck, PackageOpen, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Pedido = {
  id: number;
  nomeCliente: string;
  ruaEntrega: string;
  bairroEntrega: string;
  numeroEntrega: string;
  dataEntrega: Date | string;
  status: string;
  observacoes?: string | null;
};

const statusColors: Record<string, string> = {
  Pendente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Confirmado: "bg-blue-100 text-blue-800 border-blue-300",
  EntregueNaoPago: "bg-red-200 text-red-900 border-red-400",
  EntreguePago: "bg-red-100 text-red-700 border-red-300",
  Concluido: "bg-green-100 text-green-800 border-green-300",
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

function GrupoDesktop({
  pedidos,
  titulo,
  icone,
}: {
  pedidos: Pedido[];
  titulo: string;
  icone: React.ReactNode;
}) {
  const grupos = useMemo(() => groupByBairro(pedidos), [pedidos]);
  const bairros = Object.keys(grupos).sort();

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
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum compromisso para este dia.
          </p>
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
                    <TableHead>Cliente</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grupos[bairro].map((p) => (
                    <TableRow key={p.id}>
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

function GrupoMobile({
  pedidos,
  titulo,
  icone,
}: {
  pedidos: Pedido[];
  titulo: string;
  icone: React.ReactNode;
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
        <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
          Nenhum compromisso para este dia.
        </p>
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
                <Card key={p.id} className="border shadow-sm">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm">{p.nomeCliente}</span>
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

export default function Logistica() {
  const [dataConsulta, setDataConsulta] = useState<Date>(new Date());

  const { data, isLoading } = trpc.pedidos.listByDataLogistica.useQuery({
    data: dataConsulta,
  });

  const entregas: Pedido[] = (data?.entregas ?? []) as Pedido[];
  const coletas: Pedido[] = (data?.coletas ?? []) as Pedido[];
  const totalDia = entregas.length + coletas.length;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <Truck className="h-6 sm:h-7 w-6 sm:w-7 text-primary" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Logística</h1>
              <p className="text-xs text-muted-foreground">
                Entregas e coletas do dia, agrupadas por bairro
              </p>
            </div>
          </div>
          {!isLoading && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {totalDia} compromisso{totalDia !== 1 ? "s" : ""} em{" "}
              {format(dataConsulta, "dd/MM")}
            </Badge>
          )}
        </div>

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
              onSelect={(date) => date && setDataConsulta(date)}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>

        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">Carregando compromissos...</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden sm:block space-y-4">
              <GrupoDesktop
                pedidos={entregas}
                titulo="Entregas do Dia"
                icone={<PackageOpen className="h-4 w-4 text-blue-600" />}
              />
              <GrupoDesktop
                pedidos={coletas}
                titulo="Coletas do Dia"
                icone={<PackageCheck className="h-4 w-4 text-green-600" />}
              />
            </div>

            {/* Mobile */}
            <div className="block sm:hidden space-y-6">
              <GrupoMobile
                pedidos={entregas}
                titulo="Entregas do Dia"
                icone={<PackageOpen className="h-4 w-4 text-blue-600" />}
              />
              <Separator />
              <GrupoMobile
                pedidos={coletas}
                titulo="Coletas do Dia"
                icone={<PackageCheck className="h-4 w-4 text-green-600" />}
              />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
