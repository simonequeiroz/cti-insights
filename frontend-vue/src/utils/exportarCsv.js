// Exporta uma lista de clientes como CSV (botão "Exportar CSV" do Dashboard
// e de Relatórios). Usa ; como separador de coluna (não ,) porque o Excel em
// português usa a vírgula como separador decimal: com vírgula separando
// colunas, o Excel BR joga tudo numa coluna só. Aspas em volta de cada valor
// protegem o ; dentro dos campos, e o BOM faz o Excel reconhecer acentos.

const CABECALHO = [
  'Código', 'Cliente', 'Consultor', 'Segmento', 'Faturamento', 'Nível', 'Data da contratação', 'Serviço'
]

const escapar = valor => `"${String(valor ?? '').replace(/"/g, '""')}"`

// Ponto decimal -> vírgula, para o Excel BR reconhecer como número
const numeroCsv = valor => (valor === null || valor === undefined ? '' : String(valor).replace('.', ','))

// aaaa-mm-dd -> dd/mm/aaaa
const dataCsv = valor => {
  if (!valor) return ''
  const [ano, mes, dia] = valor.split('-')
  return `${dia}/${mes}/${ano}`
}

export const exportarClientesCsv = clientes => {
  const linhas = clientes.map(cliente => [
    cliente.codigo_cliente || '',
    cliente.nome_cliente,
    cliente.consultor || '',
    cliente.segmento,
    numeroCsv(cliente.faturamento),
    cliente.nivel_cliente,
    dataCsv(cliente.data_contratacao),
    cliente.servico || (cliente.servicos || []).join(', ')
  ].map(escapar).join(';'))

  const csv = [CABECALHO.map(escapar).join(';'), ...linhas].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `cti-insights-clientes-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()

  URL.revokeObjectURL(url)
}
