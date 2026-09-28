// Primeiros insights mostrados logo após a importação.
const maisFrequente = valores => {
  const contagem = new Map()
  valores.forEach(valor => contagem.set(valor, (contagem.get(valor) || 0) + 1))

  let melhor = null
  contagem.forEach((quantidade, valor) => {
    if (!melhor || quantidade > melhor.quantidade) melhor = { valor, quantidade }
  })

  return melhor
}

export const gerarInsights = clientes => {
  const total = clientes.length

  if (!total) {
    return []
  }

  const nivelA = clientes.filter(c => c.nivel_cliente === 'A').length
  const segmento = maisFrequente(clientes.map(c => c.segmento).filter(Boolean))
  const servico = maisFrequente(clientes.flatMap(c => c.servicos || []))
  const porcentagem = quantidade => `${Math.round((quantidade / total) * 100)}%`

  return [
    { rotulo: 'Clientes nível A', valor: nivelA.toLocaleString('pt-BR'), detalhe: `${porcentagem(nivelA)} da base` },
    segmento && { rotulo: 'Maior segmento', valor: segmento.valor, detalhe: `${segmento.quantidade} clientes (${porcentagem(segmento.quantidade)})` },
    servico && { rotulo: 'Serviço mais contratado', valor: servico.valor, detalhe: `${servico.quantidade} clientes` }
  ].filter(Boolean)
}
