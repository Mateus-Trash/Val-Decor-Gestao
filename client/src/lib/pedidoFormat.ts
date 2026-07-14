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
 * Monta o texto padrão de identificação de um pedido: quantidade + item + colaborador + bairro.
 * Ex: "10 Conjuntos com toalha Duda Sabiazal". Usado em Calendario, Pedidos e Logistica
 * pra manter o mesmo padrão visual em todo o site.
 */
export function formatarResumoPedido(pedido: PedidoParaResumo): string {
  const composicao = [...(pedido.composicaoItens ?? []), ...(pedido.composicaoKits ?? [])];
  if (composicao.length === 0) {
    return `${pedido.nomeColaborador} ${pedido.bairroEntrega}`;
  }
  const primeiro = composicao[0];
  const base = `${primeiro.quantidade} ${primeiro.nome} ${pedido.nomeColaborador} ${pedido.bairroEntrega}`;
  return composicao.length > 1 ? `${base} +${composicao.length - 1}` : base;
}
