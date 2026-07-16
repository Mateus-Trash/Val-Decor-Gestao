import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  colaboradores,
  itens,
  itensPedido,
  kitItens,
  kits,
  kitsPedido,
  pedidos,
  transacoesFinanceiras,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { getReservadoPorItemNaData } from "../estoqueUtils";

/**
 * Importação de Pedidos por Texto
 *
 * Formato esperado (um ou mais pedidos separados por linha em branco ou "---"):
 *
 * Cliente: Nome do Cliente
 * Data: 25/07/2026
 * Colaborador: Mateus (ou ID: 1)
 * Rua: Rua das Flores
 * Numero: 123
 * Bairro: Centro
 * Taxa: 50,00 (opcional)
 * Itens:
 * - 2x Toalha de Mesa Vermelha (R$ 15,00 cada)
 * - 1x Cadeira Tiffany (R$ 8,00 cada)
 * Kits:
 * - 1x Kit Casamento Premium (R$ 500,00 cada)
 * Observacoes: Observação opcional
 *
 * - Itens e Kits que não existem no catálogo são criados automaticamente.
 * - Valores em reais com vírgula decimal (R$ 15,00 = 1500 centavos).
 * - Quantidade no formato "Nx Nome (R$ valor cada)".
 * - Seções "Itens:" e "Kits:" são opcionais.
 */

interface ParsedItem {
  nome: string;
  quantidade: number;
  valorCentavos: number;
}

interface ParsedPedido {
  cliente: string;
  data: Date;
  colaboradorNome?: string;
  colaboradorId?: number;
  rua: string;
  numero: string;
  bairro: string;
  taxaEntrega: number; // em reais
  itens: ParsedItem[];
  kits: ParsedItem[];
  observacoes?: string;
}

/** Converte "R$ 15,00" ou "15,00" ou "15.00" para centavos (1500) */
function parseValorReais(texto: string): number {
  const limpo = texto.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const reais = parseFloat(limpo);
  if (isNaN(reais)) return 0;
  return Math.round(reais * 100);
}

/** Converte "25/07/2026" para Date */
function parseDataBR(texto: string): Date | null {
  const match = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const [, dia, mes, ano] = match;
  return new Date(`${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}T12:00:00`);
}

/** Faz parse de uma linha de item/kit: "2x Toalha Vermelha (R$ 15,00 cada)" */
function parseLinhaItem(linha: string): ParsedItem | null {
  const match = linha.match(/^-\s*(\d+)\s*x\s+(.+?)(?:\s*\(.*?\))?\s*$/i);
  if (!match) return null;
  const quantidade = parseInt(match[1], 10);
  const resto = match[2].trim();

  // Tentar extrair valor entre parênteses
  const valorMatch = linha.match(/\(\s*R?\$?\s*([\d.,]+)\s*(?:cada|un)?\s*\)/i);
  const valorCentavos = valorMatch ? parseValorReais(valorMatch[1]) : 0;

  // Nome do item = resto sem o parênteses
  const nome = resto.replace(/\s*\(.*?\)\s*$/, "").trim();

  return { nome, quantidade, valorCentavos };
}

/** Divide o texto em blocos de pedidos (separados por linha em branco ou ---) */
function dividirPedidos(texto: string): string[] {
  // Normalizar quebras de linha
  const normalizado = texto.replace(/\r\n/g, "\n");
  // Dividir por linha com apenas "---" ou linha em branco seguida de "Cliente:"
  const blocos: string[] = [];
  const linhas = normalizado.split("\n");
  let buffer: string[] = [];

  for (const linha of linhas) {
    const trimmed = linha.trim();
    if (trimmed === "---" || (trimmed === "" && buffer.length > 0 && buffer.some((l) => l.trim().match(/^cliente:/i)))) {
      // Se o buffer já tem um pedido completo (tem Cliente), salvar e começar novo
      if (buffer.some((l) => l.trim().match(/^cliente:/i))) {
        blocos.push(buffer.join("\n"));
        buffer = [];
      }
      continue;
    }
    if (trimmed === "" && buffer.length === 0) continue;
    buffer.push(linha);
  }
  if (buffer.some((l) => l.trim().match(/^cliente:/i))) {
    blocos.push(buffer.join("\n"));
  }
  return blocos;
}

/** Faz parse de um bloco de texto em um ParsedPedido */
function parseBlocoPedido(bloco: string): ParsedPedido | null {
  const linhas = bloco.split("\n");
  const pedido: Partial<ParsedPedido> = { itens: [], kits: [], taxaEntrega: 0 };

  let secaoAtual: "itens" | "kits" | null = null;

  for (const linha of linhas) {
    const trimmed = linha.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();

    // Detectar seções
    if (lower === "itens:" || lower === "itens") {
      secaoAtual = "itens";
      continue;
    }
    if (lower === "kits:" || lower === "kits") {
      secaoAtual = "kits";
      continue;
    }

    // Linhas de item/kit (começam com -)
    if (trimmed.startsWith("-")) {
      const parsed = parseLinhaItem(trimmed);
      if (parsed) {
        if (secaoAtual === "itens") pedido.itens!.push(parsed);
        else if (secaoAtual === "kits") pedido.kits!.push(parsed);
      }
      continue;
    }

    // Campos chave: valor
    const matchCampo = trimmed.match(/^(\w+):\s*(.*)$/i);
    if (matchCampo) {
      const [, chave, valor] = matchCampo;
      const chaveLower = chave.toLowerCase();

      if (chaveLower === "cliente") pedido.cliente = valor.trim();
      else if (chaveLower === "data") {
        const data = parseDataBR(valor.trim());
        if (data) pedido.data = data;
      }
      else if (chaveLower === "colaborador") pedido.colaboradorNome = valor.trim();
      else if (chaveLower === "rua") pedido.rua = valor.trim();
      else if (chaveLower === "numero" || chaveLower === "número") pedido.numero = valor.trim();
      else if (chaveLower === "bairro") pedido.bairro = valor.trim();
      else if (chaveLower === "taxa" || chaveLower === "taxaentrega") pedido.taxaEntrega = parseValorReais(valor) / 100;
      else if (chaveLower === "observacoes" || chaveLower === "observações" || chaveLower === "obs") pedido.observacoes = valor.trim();
    }
  }

  // Validações mínimas
  if (!pedido.cliente || !pedido.data || !pedido.rua || !pedido.numero || !pedido.bairro) {
    return null;
  }
  if (pedido.itens!.length === 0 && pedido.kits!.length === 0) {
    return null;
  }

  return pedido as ParsedPedido;
}

export const importacaoRouter = router({
  /**
   * Preview: faz o parse do texto e retorna os pedidos encontrados sem salvar nada.
   * Útil para o usuário conferir antes de confirmar.
   */
  preview: protectedProcedure
    .input(z.object({ texto: z.string().min(1, "Texto é obrigatório") }))
    .mutation(async ({ input }) => {
      const blocos = dividirPedidos(input.texto);
      const pedidos = blocos.map(parseBlocoPedido).filter((p): p is ParsedPedido => p !== null);

      // Buscar itens e kits existentes para marcar quais já existem
      const db = await getDb();
      const itensExistentes = db ? await db.select().from(itens) : [];
      const kitsExistentes = db ? await db.select().from(kits) : [];
      const colaboradoresExistentes = db ? await db.select().from(colaboradores) : [];

      return pedidos.map((p) => {
        const itensNovos = p.itens.filter(
          (i) => !itensExistentes.some((ie) => ie.nome.toLowerCase() === i.nome.toLowerCase())
        );
        const kitsNovos = p.kits.filter(
          (k) => !kitsExistentes.some((ke) => ke.nome.toLowerCase() === k.nome.toLowerCase())
        );
        const colabEncontrado = p.colaboradorNome
          ? colaboradoresExistentes.find((c) => c.nome.toLowerCase() === p.colaboradorNome!.toLowerCase())
          : null;

        return {
          cliente: p.cliente,
          data: p.data.toISOString(),
          colaborador: p.colaboradorNome ?? "",
          colaboradorEncontrado: colabEncontrado ? colabEncontrado.nome : null,
          rua: p.rua,
          numero: p.numero,
          bairro: p.bairro,
          taxaEntrega: p.taxaEntrega,
          observacoes: p.observacoes ?? "",
          itens: p.itens.map((i) => ({
            nome: i.nome,
            quantidade: i.quantidade,
            valorCentavos: i.valorCentavos,
            jaExiste: !itensNovos.includes(i),
          })),
          kits: p.kits.map((k) => ({
            nome: k.nome,
            quantidade: k.quantidade,
            valorCentavos: k.valorCentavos,
            jaExiste: !kitsNovos.includes(k),
          })),
        };
      });
    }),

  /**
   * Importar: faz o parse do texto, cria itens/kits faltantes e cria os pedidos.
   */
  importar: protectedProcedure
    .input(z.object({ texto: z.string().min(1, "Texto é obrigatório") }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const blocos = dividirPedidos(input.texto);
      const pedidosParsed = blocos.map(parseBlocoPedido).filter((p): p is ParsedPedido => p !== null);

      if (pedidosParsed.length === 0) {
        throw new Error("Nenhum pedido válido encontrado no texto. Verifique o formato.");
      }

      // Buscar listas atuais
      const todosItens = await db.select().from(itens);
      const todosKits = await db.select().from(kits);
      const todosColaboradores = await db.select().from(colaboradores);

      const resultados: { cliente: string; pedidoId: number; itensCriados: string[]; kitsCriados: string[]; erros: string[] }[] = [];

      for (const p of pedidosParsed) {
        const itensCriados: string[] = [];
        const kitsCriados: string[] = [];
        const erros: string[] = [];

        // Resolver colaborador
        let colaboradorId: number | undefined;
        if (p.colaboradorId) {
          colaboradorId = p.colaboradorId;
        } else if (p.colaboradorNome) {
          const colab = todosColaboradores.find(
            (c) => c.nome.toLowerCase() === p.colaboradorNome!.toLowerCase()
          );
          if (colab) {
            colaboradorId = colab.id;
          } else {
            erros.push(`Colaborador "${p.colaboradorNome}" não encontrado`);
          }
        }
        if (!colaboradorId) {
          // Usar o primeiro colaborador como fallback
          if (todosColaboradores.length > 0) {
            colaboradorId = todosColaboradores[0].id;
          } else {
            erros.push("Nenhum colaborador cadastrado");
            resultados.push({ cliente: p.cliente, pedidoId: 0, itensCriados, kitsCriados, erros });
            continue;
          }
        }

        // Resolver itens: criar os que não existem
        const itemMap = new Map<string, { id: number; valorCentavos: number }>();
        for (const itemParsed of p.itens) {
          const existente = todosItens.find(
            (ie) => ie.nome.toLowerCase() === itemParsed.nome.toLowerCase()
          );
          if (existente) {
            itemMap.set(itemParsed.nome, { id: existente.id, valorCentavos: itemParsed.valorCentavos || existente.valorAluguel });
          } else {
            // Criar item novo com valor padrão e quantidade total alta (100) para não bloquear
            const valorAluguel = itemParsed.valorCentavos || 1000; // default R$ 10,00
            const result = await db.insert(itens).values({
              nome: itemParsed.nome,
              valorAluguel,
              quantidadeTotal: 100,
              quantidadeDisponivel: 100,
            });
            const novoId = Number(result[0].insertId);
            todosItens.push({ id: novoId, nome: itemParsed.nome, valorAluguel, quantidadeTotal: 100, quantidadeDisponivel: 100 } as any);
            itemMap.set(itemParsed.nome, { id: novoId, valorCentavos: valorAluguel });
            itensCriados.push(itemParsed.nome);
          }
        }

        // Resolver kits: criar os que não existem (com composição automática "Pegue e Monte")
        const kitMap = new Map<string, { id: number; valorCentavos: number }>();
        for (const kitParsed of p.kits) {
          const existente = todosKits.find(
            (ke) => ke.nome.toLowerCase() === kitParsed.nome.toLowerCase()
          );
          if (existente) {
            kitMap.set(kitParsed.nome, { id: existente.id, valorCentavos: kitParsed.valorCentavos || existente.valorAluguel });
          } else {
            // Criar kit com composição automática do tipo "Pegue e Monte"
            const valorAluguel = kitParsed.valorCentavos || 5000; // default R$ 50,00
            const result = await db.insert(kits).values({
              nome: kitParsed.nome,
              valorAluguel,
            });
            const novoId = Number(result[0].insertId);
            todosKits.push({ id: novoId, nome: kitParsed.nome, valorAluguel } as any);
            kitMap.set(kitParsed.nome, { id: novoId, valorCentavos: valorAluguel });
            kitsCriados.push(kitParsed.nome);

            // Extrair tema do nome do kit e criar composição automática
            const tema = kitParsed.nome.trim().replace(/^kit\s+(simples|premium|básico|basico|completo|deluxe|luxo)?\s*/i, "");
            if (tema) {
              const nomePanos = `Panos ${tema}`;

              // Buscar ou criar Cilindro
              let cilindro = todosItens.find((i) => i.nome.toLowerCase().includes("cilindro"));
              if (!cilindro) {
                const res = await db.insert(itens).values({
                  nome: "Cilindro",
                  categoria: "Decoracoes",
                  valorAluguel: 1500,
                  quantidadeTotal: 100,
                  quantidadeDisponivel: 100,
                });
                cilindro = { id: Number(res[0].insertId), nome: "Cilindro", valorAluguel: 1500, quantidadeTotal: 100, quantidadeDisponivel: 100 } as any;
                todosItens.push(cilindro!);
                itensCriados.push("Cilindro");
              }

              // Buscar ou criar Painel de Ferro
              let painel = todosItens.find((i) => i.nome.toLowerCase().includes("painel") && i.nome.toLowerCase().includes("ferro"));
              if (!painel) {
                const res = await db.insert(itens).values({
                  nome: "Painel de Ferro",
                  categoria: "Decoracoes",
                  valorAluguel: 2000,
                  quantidadeTotal: 100,
                  quantidadeDisponivel: 100,
                });
                painel = { id: Number(res[0].insertId), nome: "Painel de Ferro", valorAluguel: 2000, quantidadeTotal: 100, quantidadeDisponivel: 100 } as any;
                todosItens.push(painel!);
                itensCriados.push("Painel de Ferro");
              }

              // Buscar ou criar Panos [tema]
              let panos = todosItens.find((i) => i.nome.toLowerCase() === nomePanos.toLowerCase());
              if (!panos) {
                const res = await db.insert(itens).values({
                  nome: nomePanos,
                  categoria: "Decoracoes",
                  valorAluguel: 1000,
                  quantidadeTotal: 100,
                  quantidadeDisponivel: 100,
                });
                panos = { id: Number(res[0].insertId), nome: nomePanos, valorAluguel: 1000, quantidadeTotal: 100, quantidadeDisponivel: 100 } as any;
                todosItens.push(panos!);
                itensCriados.push(nomePanos);
              }

              // Inserir composição do kit: 3 Cilindros + 1 Painel de Ferro + 1 Panos [tema]
              await db.insert(kitItens).values([
                { kitId: novoId, itemId: cilindro!.id, quantidade: 3 },
                { kitId: novoId, itemId: painel!.id, quantidade: 1 },
                { kitId: novoId, itemId: panos!.id, quantidade: 1 },
              ]);
            }
          }
        }

        // Verificar estoque
        const demandaPorItem = new Map<number, number>();
        for (const itemParsed of p.itens) {
          const info = itemMap.get(itemParsed.nome);
          if (info) {
            demandaPorItem.set(info.id, (demandaPorItem.get(info.id) || 0) + itemParsed.quantidade);
          }
        }
        for (const kitParsed of p.kits) {
          const info = kitMap.get(kitParsed.nome);
          if (info) {
            const kitComposicao = await db.select().from(kitItens).where(eq(kitItens.kitId, info.id));
            for (const ki of kitComposicao) {
              const qtdNecessaria = kitParsed.quantidade * ki.quantidade;
              demandaPorItem.set(ki.itemId, (demandaPorItem.get(ki.itemId) || 0) + qtdNecessaria);
            }
          }
        }

        const reservadoNaData = await getReservadoPorItemNaData(db, p.data);
        for (const [itemId, qtdTotal] of Array.from(demandaPorItem.entries())) {
          const [itemDb] = await db.select({ nome: itens.nome, quantidadeTotal: itens.quantidadeTotal }).from(itens).where(eq(itens.id, itemId)).limit(1);
          if (!itemDb) {
            erros.push(`Item ID ${itemId} não encontrado`);
            continue;
          }
          const disponivel = itemDb.quantidadeTotal - (reservadoNaData.get(itemId) || 0);
          if (disponivel < qtdTotal) {
            // Auto-expandir estoque se necessário (itens criados pela importação têm 100 unidades)
            erros.push(`Estoque insuficiente para ${itemDb.nome} (precisa ${qtdTotal}, disponível ${disponivel})`);
          }
        }

        if (erros.length > 0) {
          resultados.push({ cliente: p.cliente, pedidoId: 0, itensCriados, kitsCriados, erros });
          continue;
        }

        // Calcular valor total
        const totalItens = p.itens.reduce((acc, i) => {
          const info = itemMap.get(i.nome);
          return acc + (info ? info.valorCentavos * i.quantidade : 0);
        }, 0);
        const totalKits = p.kits.reduce((acc, k) => {
          const info = kitMap.get(k.nome);
          return acc + (info ? info.valorCentavos * k.quantidade : 0);
        }, 0);
        const valorTotal = totalItens + totalKits;

        // Criar pedido
        const result = await db.insert(pedidos).values({
          nomeCliente: p.cliente,
          colaboradorId,
          data: p.data,
          ruaEntrega: p.rua,
          bairroEntrega: p.bairro,
          numeroEntrega: p.numero,
          valorTotal,
          valorTaxaEntrega: p.taxaEntrega,
          status: "Pendente",
          observacoes: p.observacoes,
        });
        const pedidoId = Number(result[0].insertId);

        // Inserir itens do pedido
        for (const itemParsed of p.itens) {
          const info = itemMap.get(itemParsed.nome);
          if (info) {
            await db.insert(itensPedido).values({
              pedidoId,
              itemId: info.id,
              quantidade: itemParsed.quantidade,
              valorUnitario: info.valorCentavos,
            });
          }
        }

        // Inserir kits do pedido
        for (const kitParsed of p.kits) {
          const info = kitMap.get(kitParsed.nome);
          if (info) {
            await db.insert(kitsPedido).values({
              pedidoId,
              kitId: info.id,
              quantidade: kitParsed.quantidade,
              valorUnitario: info.valorCentavos,
            });
          }
        }

        // Criar transação de receita
        await db.insert(transacoesFinanceiras).values({
          pedidoId,
          tipo: "receita",
          descricao: `Pedido #${pedidoId}`,
          valor: valorTotal,
        });

        // Criar transação de taxa de entrega se houver
        if (p.taxaEntrega > 0) {
          await db.insert(transacoesFinanceiras).values({
            pedidoId,
            tipo: "taxa_entrega",
            descricao: `Taxa de entrega - Pedido #${pedidoId}`,
            valor: Math.round(p.taxaEntrega * 100),
          });
        }

        resultados.push({ cliente: p.cliente, pedidoId, itensCriados, kitsCriados, erros: [] });
      }

      return { totalPedidos: resultados.length, resultados };
    }),
});
