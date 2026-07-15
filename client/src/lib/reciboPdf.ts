import { jsPDF } from "jspdf";

/**
 * Gera um recibo em PDF com os dados da empresa Val Decorações.
 * O PDF possui:
 *  - Cabeçalho com nome da empresa, proprietária e CPF
 *  - Campo de número do recibo e data
 *  - Tabela de itens do pedido (comanda) com linhas em branco
 *  - Campo de valor total
 *  - Linha de assinatura da Francisca
 */
export function gerarReciboPDF(opcoes?: {
  numeroRecibo?: string;
  data?: string;
  itens?: { descricao: string; quantidade: number; valorUnitario: number }[];
  valorTotal?: number;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const larguraPagina = doc.internal.pageSize.getWidth();
  const margemEsquerda = 20;
  const margemDireita = 20;
  const larguraUtil = larguraPagina - margemEsquerda - margemDireita;

  // ─── Cabeçalho ───────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("VAL DECORAÇÕES", larguraPagina / 2, 25, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Proprietária: Francisca Valkeane Carvalho Monte", larguraPagina / 2, 33, { align: "center" });
  doc.text("CPF: 007.678.023-65", larguraPagina / 2, 39, { align: "center" });

  // Linha divisória
  doc.setLineWidth(0.5);
  doc.line(margemEsquerda, 44, larguraPagina - margemDireita, 44);

  // ─── Número do recibo e data ────────────────────────────────
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const numRecibo = opcoes?.numeroRecibo ?? "____";
  doc.text(`Recibo Nº: ${numRecibo}`, margemEsquerda, 54);

  const dataFormatada = opcoes?.data ?? new Date().toLocaleDateString("pt-BR");
  doc.text(`Data: ${dataFormatada}`, larguraPagina - margemDireita, 54, { align: "right" });

  // ─── Título da comanda ──────────────────────────────────────
  doc.setFontSize(13);
  doc.text("COMANDA DE ALUGUEL", larguraPagina / 2, 64, { align: "center" });

  // ─── Tabela de itens ────────────────────────────────────────
  const yInicioTabela = 72;
  const alturaLinha = 8;

  // Cabeçalho da tabela
  doc.setFillColor(240, 240, 240);
  doc.rect(margemEsquerda, yInicioTabela, larguraUtil, alturaLinha, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Qtd.", margemEsquerda + 3, yInicioTabela + 5.5);
  doc.text("Descrição do Item", margemEsquerda + 20, yInicioTabela + 5.5);
  doc.text("Valor Unit.", larguraPagina - margemDireita - 50, yInicioTabela + 5.5);
  doc.text("Subtotal", larguraPagina - margemDireita - 3, yInicioTabela + 5.5, { align: "right" });

  // Linhas da tabela
  doc.setFont("helvetica", "normal");
  let yAtual = yInicioTabela + alturaLinha;

  // Itens fornecidos (se houver)
  const itens = opcoes?.itens ?? [];
  if (itens.length > 0) {
    itens.forEach((item) => {
      const subtotal = item.quantidade * item.valorUnitario;
      doc.text(String(item.quantidade), margemEsquerda + 3, yAtual + 5.5);
      doc.text(item.descricao.substring(0, 50), margemEsquerda + 20, yAtual + 5.5);
      doc.text(
        item.valorUnitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        larguraPagina - margemDireita - 50,
        yAtual + 5.5
      );
      doc.text(
        subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        larguraPagina - margemDireita - 3,
        yAtual + 5.5,
        { align: "right" }
      );
      doc.setLineWidth(0.2);
      doc.line(margemEsquerda, yAtual + alturaLinha, larguraPagina - margemDireita, yAtual + alturaLinha);
      yAtual += alturaLinha;
    });
  }

  // Linhas em branco para preenchimento manual (comanda)
  const numLinhasBrancas = 12;
  for (let i = 0; i < numLinhasBrancas; i++) {
    doc.setLineWidth(0.2);
    doc.line(margemEsquerda, yAtual + alturaLinha, larguraPagina - margemDireita, yAtual + alturaLinha);
    yAtual += alturaLinha;
  }

  // ─── Valor total ────────────────────────────────────────────
  yAtual += 5;
  doc.setLineWidth(0.5);
  doc.line(margemEsquerda, yAtual, larguraPagina - margemDireita, yAtual);
  yAtual += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("VALOR TOTAL:", margemEsquerda, yAtual);

  const valorTotal = opcoes?.valorTotal
    ? opcoes.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "R$ ___________";
  doc.text(valorTotal, larguraPagina - margemDireita - 3, yAtual, { align: "right" });

  // ─── Assinatura ─────────────────────────────────────────────
  const yAssinatura = yAtual + 40;
  doc.setLineWidth(0.5);
  doc.line(margemEsquerda + 40, yAssinatura, larguraPagina - margemDireita - 40, yAssinatura);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Francisca Valkeane Carvalho Monte", larguraPagina / 2, yAssinatura + 5, { align: "center" });
  doc.text("CPF: 007.678.023-65", larguraPagina / 2, yAssinatura + 10, { align: "center" });

  // ─── Rodapé ─────────────────────────────────────────────────
  const yRodape = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Val Decorações - Recibo de Aluguel", larguraPagina / 2, yRodape, { align: "center" });
  doc.setTextColor(0, 0, 0);

  // ─── Salvar ─────────────────────────────────────────────────
  const nomeArquivo = `recibo-val-decoracoes-${numRecibo}.pdf`;
  doc.save(nomeArquivo);
}
