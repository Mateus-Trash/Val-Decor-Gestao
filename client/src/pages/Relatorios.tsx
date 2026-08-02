import { Fragment, useMemo, useState } from "react";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  DollarSign,
  MapPin,
  Package,
  Shirt,
  ShoppingCart,
  Ticket,
  User,
  Users,
} from "lucide-react";
import { PageHeading } from "@/components/PageHeading";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type TipoPeriodo = "dia" | "semana" | "mes" | "ano" | "personalizado";

type RankingEntry = {
  id: number;
  nome: string;
  categoria: string;
  quantidadeTotal: number;
  numeroPedidos: number;
  valorTotalArrecadado: number;
  valorMedioUnitario: number;
  valorAtualCadastro: number;
  precos: { valorUnitario: number; quantidade: number; numeroPedidos: number }[];
  bairros: { bairro: string; quantidade: number }[];
  clientes: { nomeCliente: string; quantidade: number }[];
};

function formatCurrency(value: number) {
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Relatorios() {
  const hoje = new Date();
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>("mes");

  // Dia / Semana: uma única data de referência
  const [dataReferencia, setDataReferencia] = useState(format(hoje, "yyyy-MM-dd"));

  // Mês
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth());
  const [anoSelecionadoMes, setAnoSelecionadoMes] = useState(hoje.getFullYear());

  // Ano
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());

  // Personalizado
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState(format(startOfMonth(hoje), "yyyy-MM-dd"));
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState(format(endOfMonth(hoje), "yyyy-MM-dd"));

  const anosDisponiveis = Array.from({ length: 6 }, (_, i) => hoje.getFullYear() - 3 + i);

  const { dataInicio, dataFim } = useMemo(() => {
    switch (tipoPeriodo) {
      case "dia": {
        const ref = new Date(dataReferencia + "T00:00:00");
        return { dataInicio: startOfDay(ref), dataFim: endOfDay(ref) };
      }
      case "semana": {
        const ref = new Date(dataReferencia + "T00:00:00");
        return {
          dataInicio: startOfWeek(ref, { weekStartsOn: 0 }),
          dataFim: endOfWeek(ref, { weekStartsOn: 0 }),
        };
      }
      case "ano": {
        const ref = new Date(anoSelecionado, 0, 1);
        return { dataInicio: startOfYear(ref), dataFim: endOfYear(ref) };
      }
      case "personalizado": {
        const inicio = new Date(dataInicioPersonalizada + "T00:00:00");
        const fim = new Date(dataFimPersonalizada + "T23:59:59");
        return { dataInicio: inicio, dataFim: fim };
      }
      case "mes":
      default: {
        const ref = new Date(anoSelecionadoMes, mesSelecionado, 1);
        return { dataInicio: startOfMonth(ref), dataFim: endOfMonth(ref) };
      }
    }
  }, [tipoPeriodo, dataReferencia, mesSelecionado, anoSelecionadoMes, anoSelecionado, dataInicioPersonalizada, dataFimPersonalizada]);

  const { data, isLoading } = trpc.relatorios.getRelatorioPeriodo.useQuery({
    dataInicio,
    dataFim,
  });

  const resumo = data?.resumoGeral;
  const rankingKits = data?.rankingKits ?? [];
  const rankingItens = data?.rankingItens ?? [];
  const rankingBairros = data?.rankingBairros ?? [];
  const rankingClientes = data?.rankingClientes ?? [];
  const rankingColaboradores = data?.rankingColaboradores ?? [];

  const descricaoPeriodo = `${format(dataInicio, "dd/MM/yyyy", { locale: ptBR })} até ${format(dataFim, "dd/MM/yyyy", { locale: ptBR })}`;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        <PageHeading icon={<BarChart3 className="h-6 sm:h-7 w-6 sm:w-7 text-primary" />} title="Relatórios" />

        {/* Seletor de período */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Tabs value={tipoPeriodo} onValueChange={(v) => setTipoPeriodo(v as TipoPeriodo)}>
              <TabsList className="grid grid-cols-5 w-full sm:w-auto sm:inline-grid">
                <TabsTrigger value="dia">Dia</TabsTrigger>
                <TabsTrigger value="semana">Semana</TabsTrigger>
                <TabsTrigger value="mes">Mês</TabsTrigger>
                <TabsTrigger value="ano">Ano</TabsTrigger>
                <TabsTrigger value="personalizado">Personalizado</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              {(tipoPeriodo === "dia" || tipoPeriodo === "semana") && (
                <div className="flex flex-col gap-1.5 w-full sm:w-56">
                  <Label>{tipoPeriodo === "dia" ? "Selecione o dia" : "Selecione uma data da semana"}</Label>
                  <Input
                    type="date"
                    value={dataReferencia}
                    onChange={(e) => setDataReferencia(e.target.value)}
                  />
                </div>
              )}

              {tipoPeriodo === "mes" && (
                <>
                  <div className="flex flex-col gap-1.5 w-full sm:w-48">
                    <Label>Mês</Label>
                    <Select value={String(mesSelecionado)} onValueChange={(v) => setMesSelecionado(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MESES.map((mes, idx) => (
                          <SelectItem key={mes} value={String(idx)}>{mes}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5 w-full sm:w-32">
                    <Label>Ano</Label>
                    <Select value={String(anoSelecionadoMes)} onValueChange={(v) => setAnoSelecionadoMes(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {anosDisponiveis.map((ano) => (
                          <SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {tipoPeriodo === "ano" && (
                <div className="flex flex-col gap-1.5 w-full sm:w-32">
                  <Label>Ano</Label>
                  <Select value={String(anoSelecionado)} onValueChange={(v) => setAnoSelecionado(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {anosDisponiveis.map((ano) => (
                        <SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {tipoPeriodo === "personalizado" && (
                <>
                  <div className="flex flex-col gap-1.5 w-full sm:w-48">
                    <Label>De</Label>
                    <Input
                      type="date"
                      value={dataInicioPersonalizada}
                      onChange={(e) => setDataInicioPersonalizada(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 w-full sm:w-48">
                    <Label>Até</Label>
                    <Input
                      type="date"
                      value={dataFimPersonalizada}
                      onChange={(e) => setDataFimPersonalizada(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground">Período selecionado: {descricaoPeriodo}</p>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : !resumo || resumo.totalPedidos === 0 ? (
          <EmptyState icon={BarChart3} message="Nenhum aluguel encontrado nesse período." />
        ) : (
          <>
            {/* Resumo geral */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <ResumoCard icon={DollarSign} label="Faturamento Total" value={formatCurrency(resumo.faturamentoTotal)} />
              <ResumoCard icon={ShoppingCart} label="Total de Pedidos" value={String(resumo.totalPedidos)} />
              <ResumoCard icon={DollarSign} label="Ticket Médio" value={formatCurrency(resumo.ticketMedio)} />
              <ResumoCard icon={Package} label="Itens Avulsos Alugados" value={String(resumo.totalItensAvulsosQuantidade)} />
              <ResumoCard icon={Shirt} label="Kits Alugados" value={String(resumo.totalKitsQuantidade)} />
              <ResumoCard icon={MapPin} label="Bairros Atendidos" value={String(resumo.totalBairrosDistintos)} />
              <ResumoCard icon={Users} label="Clientes Distintos" value={String(resumo.totalClientesDistintos)} />
              <ResumoCard icon={User} label="Colaboradores Envolvidos" value={String(rankingColaboradores.length)} />
            </div>

            <RankingDetalhado
              titulo="Ranking de Kits Alugados"
              icone={<Shirt className="h-5 w-5 text-primary" />}
              itemLabel="Kit"
              entradas={rankingKits}
              mensagemVazio="Nenhum kit alugado nesse período."
            />

            <RankingDetalhado
              titulo="Ranking de Itens Avulsos Alugados"
              icone={<Package className="h-5 w-5 text-primary" />}
              itemLabel="Item"
              entradas={rankingItens}
              mensagemVazio="Nenhum item avulso alugado nesse período (só kits, ou nenhum aluguel)."
            />

            {/* Ranking de bairros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MapPin className="h-5 w-5 text-primary" /> Ranking de Bairros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bairro</TableHead>
                        <TableHead className="text-right">Nº Pedidos</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankingBairros.map((b) => (
                        <TableRow key={b.bairro}>
                          <TableCell className="font-medium">{b.bairro}</TableCell>
                          <TableCell className="text-right">{b.totalPedidos}</TableCell>
                          <TableCell className="text-right">{formatCurrency(b.valorTotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="block sm:hidden space-y-2">
                  {rankingBairros.map((b) => (
                    <div key={b.bairro} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-sm">{b.bairro}</p>
                        <p className="text-xs text-muted-foreground">{b.totalPedidos} pedido(s)</p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(b.valorTotal)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ranking de clientes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="h-5 w-5 text-primary" /> Ranking de Clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Nº Pedidos</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankingClientes.map((c) => (
                        <TableRow key={c.nomeCliente}>
                          <TableCell className="font-medium">{c.nomeCliente}</TableCell>
                          <TableCell className="text-right">{c.totalPedidos}</TableCell>
                          <TableCell className="text-right">{formatCurrency(c.valorTotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="block sm:hidden space-y-2">
                  {rankingClientes.map((c) => (
                    <div key={c.nomeCliente} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-sm">{c.nomeCliente}</p>
                        <p className="text-xs text-muted-foreground">{c.totalPedidos} pedido(s)</p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(c.valorTotal)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ranking de colaboradores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <User className="h-5 w-5 text-primary" /> Ranking de Colaboradores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead className="text-right">Nº Pedidos</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankingColaboradores.map((c) => (
                        <TableRow key={c.colaboradorId}>
                          <TableCell className="font-medium">{c.nome}</TableCell>
                          <TableCell className="text-right">{c.totalPedidos}</TableCell>
                          <TableCell className="text-right">{formatCurrency(c.valorTotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="block sm:hidden space-y-2">
                  {rankingColaboradores.map((c) => (
                    <div key={c.colaboradorId} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-sm">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{c.totalPedidos} pedido(s)</p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(c.valorTotal)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function ResumoCard({ icon: Icon, label, value }: { icon: typeof DollarSign; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 sm:pt-6 sm:pb-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Icon className="h-4 w-4" />
          <span className="text-xs sm:text-sm">{label}</span>
        </div>
        <p className="text-lg sm:text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function RankingDetalhado({
  titulo,
  icone,
  itemLabel,
  entradas,
  mensagemVazio,
}: {
  titulo: string;
  icone: React.ReactNode;
  itemLabel: string;
  entradas: RankingEntry[];
  mensagemVazio: string;
}) {
  const [expandidoId, setExpandidoId] = useState<number | null>(null);

  function toggleExpandido(id: number) {
    setExpandidoId((atual) => (atual === id ? null : id));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          {icone} {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entradas.length === 0 ? (
          <EmptyState icon={Ticket} message={mensagemVazio} />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>{itemLabel}</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Nº Pedidos</TableHead>
                    <TableHead className="text-right">Valor Médio</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entradas.map((entrada, idx) => {
                    const aberto = expandidoId === entrada.id;
                    return (
                      <Fragment key={entrada.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleExpandido(entrada.id)}
                        >
                          <TableCell className="text-muted-foreground">{idx + 1}º</TableCell>
                          <TableCell className="font-medium">{entrada.nome}</TableCell>
                          <TableCell className="text-right">{entrada.quantidadeTotal}</TableCell>
                          <TableCell className="text-right">{entrada.numeroPedidos}</TableCell>
                          <TableCell className="text-right">{formatCurrency(entrada.valorMedioUnitario)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(entrada.valorTotalArrecadado)}</TableCell>
                          <TableCell>
                            {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </TableCell>
                        </TableRow>
                        {aberto && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/30">
                              <DetalheEntrada entrada={entrada} />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="block sm:hidden space-y-2">
              {entradas.map((entrada, idx) => {
                const aberto = expandidoId === entrada.id;
                return (
                  <div key={entrada.id} className="rounded-lg border overflow-hidden">
                    <button
                      className="w-full text-left p-3 flex items-center justify-between gap-2"
                      onClick={() => toggleExpandido(entrada.id)}
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{idx + 1}º lugar</p>
                        <p className="font-medium text-sm truncate">{entrada.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {entrada.quantidadeTotal} unid. em {entrada.numeroPedidos} pedido(s)
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-sm font-semibold">{formatCurrency(entrada.valorTotalArrecadado)}</p>
                        {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>
                    {aberto && (
                      <div className="border-t p-3 bg-muted/30">
                        <DetalheEntrada entrada={entrada} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DetalheEntrada({ entrada }: { entrada: RankingEntry }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2 text-sm">
      <div>
        <p className="font-semibold mb-1.5">Por valor cobrado</p>
        <ul className="space-y-1">
          {entrada.precos.map((p) => (
            <li key={p.valorUnitario} className="flex justify-between gap-2 text-muted-foreground">
              <span>{formatCurrency(p.valorUnitario)}</span>
              <span>{p.quantidade} un. ({p.numeroPedidos} pedido(s))</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-semibold mb-1.5">Por bairro</p>
        <ul className="space-y-1">
          {entrada.bairros.map((b) => (
            <li key={b.bairro} className="flex justify-between gap-2 text-muted-foreground">
              <span>{b.bairro}</span>
              <span>{b.quantidade} un.</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-semibold mb-1.5">Quem mais alugou</p>
        <ul className="space-y-1">
          {entrada.clientes.map((c) => (
            <li key={c.nomeCliente} className="flex justify-between gap-2 text-muted-foreground">
              <span>{c.nomeCliente}</span>
              <span>{c.quantidade} un.</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="md:col-span-3 text-xs text-muted-foreground pt-1 border-t">
        Valor de cadastro atual: {formatCurrency(entrada.valorAtualCadastro)}
      </div>
    </div>
  );
}
