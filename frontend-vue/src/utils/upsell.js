// Regras de oportunidade de upsell. As referências (mediana, média e adoção
// de cada serviço) vêm sempre da base inteira, para o resultado de um cliente
// não mudar conforme o filtro aberto no Dashboard.

// Com menos clientes que isso, a comparação dentro do segmento não diz nada
const MINIMO_CLIENTES_SEGMENTO = 3

// Um serviço é "comum no segmento" quando 60% dos clientes dele têm
const ADOCAO_MINIMA = 0.6

// Quanto abaixo da média o cliente precisa estar para contar como "poucos
// serviços": 1 serviço contra média de 1,1 não é diferença de verdade
const FOLGA_MINIMA_SERVICOS = 0.25

// Diferença mínima, em pontos percentuais, para destacar um segmento
const DIFERENCA_MINIMA_PONTOS = 5

const servicosDe = cliente => cliente.servicos || []

const mediana = valores => {
  const ordenados = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(ordenados.length / 2)
  return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2
}

const agruparPorSegmento = base => {
  const grupos = new Map()

  base.forEach(cliente => {
    grupos.set(cliente.segmento, [...(grupos.get(cliente.segmento) || []), cliente])
  })

  return grupos
}

const resumirSegmento = clientes => {
  const quantidadePorServico = new Map()

  clientes.flatMap(servicosDe).forEach(servico => {
    quantidadePorServico.set(servico, (quantidadePorServico.get(servico) || 0) + 1)
  })

  return {
    medianaFaturamento: mediana(clientes.map(cliente => cliente.faturamento || 0)),
    mediaServicos: clientes.flatMap(servicosDe).length / clientes.length,
    adocao: [...quantidadePorServico]
      .map(([servico, quantidade]) => ({ servico, proporcao: quantidade / clientes.length }))
      .sort((a, b) => b.proporcao - a.proporcao)
  }
}

const motivosDoCliente = (cliente, resumo) => {
  if (!resumo) {
    return []
  }

  const motivos = []
  const quantidadeServicos = servicosDe(cliente).length

  if ((cliente.faturamento || 0) > resumo.medianaFaturamento && resumo.mediaServicos - quantidadeServicos >= FOLGA_MINIMA_SERVICOS) {
    const media = resumo.mediaServicos.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
    motivos.push(`Faturamento acima da mediana do segmento, com poucos serviços (${quantidadeServicos} contra média de ${media})`)
  }

  const servicoFaltante = resumo.adocao.find(({ servico, proporcao }) => {
    return proporcao >= ADOCAO_MINIMA && !servicosDe(cliente).includes(servico)
  })

  if (servicoFaltante) {
    motivos.push(`${Math.round(servicoFaltante.proporcao * 100)}% do segmento ${cliente.segmento} tem ${servicoFaltante.servico}; este cliente não tem`)
  }

  return motivos
}

// Hipótese H03: segmento com muitos contratos e pouco faturamento
const segmentoComPotencial = (base, grupos) => {
  const totalServicos = base.flatMap(servicosDe).length
  const totalFaturamento = base.reduce((soma, cliente) => soma + (cliente.faturamento || 0), 0)

  if (!totalServicos || !totalFaturamento) {
    return null
  }

  const candidatos = [...grupos].map(([segmento, clientes]) => {
    const participacaoServicos = (clientes.flatMap(servicosDe).length / totalServicos) * 100
    const participacaoFaturamento = (clientes.reduce((soma, cliente) => soma + (cliente.faturamento || 0), 0) / totalFaturamento) * 100
    return { segmento, participacaoServicos, participacaoFaturamento, diferenca: participacaoServicos - participacaoFaturamento }
  })

  const melhor = candidatos.sort((a, b) => b.diferenca - a.diferenca)[0]

  return melhor && melhor.diferenca >= DIFERENCA_MINIMA_PONTOS ? melhor : null
}

// base: todos os clientes; visiveis: os que passam pelos filtros da tela.
export const analisarUpsell = (base, visiveis) => {
  const grupos = agruparPorSegmento(base)
  const resumos = new Map(
    [...grupos]
      .filter(([, clientes]) => clientes.length >= MINIMO_CLIENTES_SEGMENTO)
      .map(([segmento, clientes]) => [segmento, resumirSegmento(clientes)])
  )

  return {
    oportunidades: visiveis
      .map(cliente => ({ cliente, motivos: motivosDoCliente(cliente, resumos.get(cliente.segmento)) }))
      .filter(item => item.motivos.length)
      .sort((a, b) => (b.cliente.faturamento || 0) - (a.cliente.faturamento || 0)),
    segmentoPotencial: segmentoComPotencial(base, grupos)
  }
}
