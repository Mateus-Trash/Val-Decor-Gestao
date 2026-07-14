export interface ComposicaoItem {
  nome: string;
  quantidade: number;
}

export interface PedidoParaResumo {
  nomeColaborador: string;
  bairroEntrega: string;
  composicaoItens?: ComposicaoItem[];
  composicaoKits?: ComposicaoItem[];
}

/**
 * Monta o texto padrão de identificação de um pedido: conteúdo completo do aluguel
 * (itens + kits, cada um como "Nx Nome") separados por " + ", seguido do colaborador
 * e do bairro, separados por " | ".
 * Ex: "10x Conjuntos sem Toalha + 1x Kit Simples Barbie Antigo | Brenda Eduarda | Santa Luzia"
 * Usado em Calendario, Pedidos e Logistica pra manter o mesmo padrão visual em todo o site.
 * O nome do cliente NÃO entra nesse resumo — deixou de ser o identificador principal do pedido.
 */
export function formatarResumoPedido(pedido: PedidoParaResumo): string {
  const composicao = [...(pedido.composicaoItens ?? []), ...(pedido.composicaoKits ?? [])];
  const conteudo =
    composicao.length > 0
      ? composicao.map((c) => `${c.quantidade}x ${c.nome}`).join(" + ")
      : "Sem itens";
  return `${conteudo} | ${pedido.nomeColaborador} | ${pedido.bairroEntrega}`;
}
