// Resume o que o tratamento corrigiu, a partir de etl_original de cada
// cliente. Só conta campos em que o valor mudou de verdade (grafia,
// maiúscula); data e faturamento só mudam de formato, então ficam de fora.
const CAMPOS_CORRIGIDOS = {
  segmento: 'Segmento',
  consultor: 'Consultor',
  nivel_cliente: 'Nível',
  nome_cliente: 'Nome',
  cidade: 'Cidade'
}

export const resumirCorrecoes = clientes => {
  const contagem = new Map()
  let clientesCorrigidos = 0

  clientes.forEach(cliente => {
    const originais = cliente.etl_original || {}
    let corrigido = false

    Object.keys(CAMPOS_CORRIGIDOS).forEach(campo => {
      if (!(campo in originais)) return

      corrigido = true
      const chave = `${campo}|${originais[campo]}|${cliente[campo]}`
      const atual = contagem.get(chave)

      if (atual) {
        atual.quantidade++
      } else {
        contagem.set(chave, {
          chave,
          campo: CAMPOS_CORRIGIDOS[campo],
          de: originais[campo],
          para: cliente[campo],
          quantidade: 1
        })
      }
    })

    if (corrigido) clientesCorrigidos++
  })

  return {
    clientesCorrigidos,
    lista: [...contagem.values()].sort((a, b) => b.quantidade - a.quantidade)
  }
}
