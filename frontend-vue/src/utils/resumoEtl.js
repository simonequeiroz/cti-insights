// Resumo do que o ETL fez com a base: quais grafias foram unificadas,
// quantos valores mudaram de formato e como ficou a distribuição por nível.
//
// Tudo é calculado a partir de "etl_original", que o uploadStore guarda em
// cada cliente com o valor ORIGINAL de cada campo que o tratamento alterou.
// Assim o resumo vale para a base atual, mesmo depois de recarregar a página.

// Campos em que o ETL corrige a grafia: mostramos cada "de → para".
const CAMPOS_PADRONIZADOS = [
  { campo: 'segmento', rotulo: 'Segmento' },
  { campo: 'consultor', rotulo: 'Consultor' },
  { campo: 'nivel_cliente', rotulo: 'Nível' }
]

// Campos em que o ETL só converte o formato (o valor é o mesmo): mostramos
// a quantidade e um exemplo, pra não listar centenas de datas uma a uma.
const CAMPOS_CONVERTIDOS = [
  { campo: 'data_contratacao', rotulo: 'Data de contratação', destino: 'aaaa-mm-dd' },
  { campo: 'faturamento', rotulo: 'Faturamento', destino: 'número' }
]

// Base processada antes desta versão não tem "etl_original": aí não dá pra
// saber o que foi corrigido (diferente de "nada precisou ser corrigido").
export const temRegistroEtl = clientes => {
  return clientes.length > 0 && clientes.every(c => c.etl_original)
}

export const resumirEtl = clientes => {
  const padronizacoes = CAMPOS_PADRONIZADOS.map(({ campo, rotulo }) => {
    const contagem = new Map()

    clientes.forEach(cliente => {
      const original = cliente.etl_original?.[campo]

      if (original === undefined) {
        return
      }

      const chave = `${original}\u0000${cliente[campo]}`
      const atual = contagem.get(chave) || { original, tratado: cliente[campo], quantidade: 0 }
      atual.quantidade++
      contagem.set(chave, atual)
    })

    const itens = [...contagem.values()].sort((a, b) => b.quantidade - a.quantidade)
    const quantidade = itens.reduce((soma, item) => soma + item.quantidade, 0)

    return { campo, rotulo, itens, quantidade }
  }).filter(grupo => grupo.quantidade > 0)

  const conversoes = CAMPOS_CONVERTIDOS.map(({ campo, rotulo, destino }) => {
    const alterados = clientes.filter(c => c.etl_original?.[campo] !== undefined)
    const exemplo = alterados[0]

    return {
      campo,
      rotulo,
      destino,
      quantidade: alterados.length,
      exemplo: exemplo ? { original: exemplo.etl_original[campo], tratado: exemplo[campo] } : null
    }
  }).filter(grupo => grupo.quantidade > 0)

  // "Linhas corrigidas" conta só correção de grafia; conversão de formato
  // (ex.: toda data de um .xlsx) não é erro de digitação e inflaria o número.
  const linhasCorrigidas = clientes.filter(cliente => {
    return CAMPOS_PADRONIZADOS.some(({ campo }) => cliente.etl_original?.[campo] !== undefined)
  }).length

  const correcoes = padronizacoes.reduce((soma, grupo) => soma + grupo.quantidade, 0)

  // Quantas grafias diferentes de segmento chegaram x quantas categorias
  // sobraram depois do tratamento (a evidência da hipótese H01).
  const grafiasSegmento = new Set(clientes.map(c => c.etl_original?.segmento ?? c.segmento)).size
  const categoriasSegmento = new Set(clientes.map(c => c.segmento)).size

  return {
    padronizacoes,
    conversoes,
    linhasCorrigidas,
    correcoes,
    grafiasSegmento,
    categoriasSegmento
  }
}

export const distribuicaoNiveis = clientes => {
  return ['A', 'B', 'C'].map(nivel => {
    const quantidade = clientes.filter(c => c.nivel_cliente === nivel).length
    const percentual = clientes.length ? Math.round((quantidade / clientes.length) * 100) : 0
    return { nivel, quantidade, percentual }
  })
}

// Mesmas cores do gráfico por nível do Dashboard (A azul, B laranja, C cinza).
export const ESTILO_NIVEL = {
  A: { selo: 'bg-blue-50 text-[#006EB7]', barra: 'bg-[#006EB7]' },
  B: { selo: 'bg-orange-50 text-[#A85700]', barra: 'bg-[#FF8F00]' },
  C: { selo: 'bg-slate-100 text-slate-600', barra: 'bg-[#94A3B8]' }
}
