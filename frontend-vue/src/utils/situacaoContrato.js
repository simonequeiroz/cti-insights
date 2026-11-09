// Situação do contrato, a partir das colunas opcionais status_contrato e
// data_fim_contrato da planilha. Calculada na hora de exibir, para um
// contrato com término futuro virar inativo quando a data chegar.

export const SITUACAO = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  NAO_INFORMADO: 'Não informado'
}

export const ESTILO_SITUACAO = {
  [SITUACAO.ATIVO]: 'bg-green-50 text-green-700',
  [SITUACAO.INATIVO]: 'bg-red-50 text-red-600',
  [SITUACAO.NAO_INFORMADO]: 'bg-gray-100 text-gray-600'
}

// Hoje em "aaaa-mm-dd", no fuso local (comparável com as datas da base)
export const hojeIso = () => {
  const hoje = new Date()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${hoje.getFullYear()}-${mes}-${dia}`
}

export const situacaoContrato = cliente => {
  const { status_contrato: status, data_fim_contrato: dataFim, saiu_da_planilha_em: saiuEm } = cliente

  // Estava na base e não veio numa importação posterior
  if (saiuEm || (dataFim && dataFim < hojeIso())) {
    return SITUACAO.INATIVO
  }

  if (status) {
    return status
  }

  return dataFim ? SITUACAO.ATIVO : SITUACAO.NAO_INFORMADO
}

// Sem informação, o cliente conta como ativo: uma planilha sem as colunas
// opcionais continua gerando os mesmos números de sempre.
export const estaAtivo = cliente => situacaoContrato(cliente) !== SITUACAO.INATIVO

export const temSituacaoInformada = clientes => {
  return clientes.some(cliente => cliente.status_contrato || cliente.data_fim_contrato || cliente.saiu_da_planilha_em)
}

const formatarDataIso = iso => iso.split('-').reverse().join('/')

// A data em que o cliente sumiu da planilha não é a do cancelamento real,
// por isso aparece identificada. Vazio quando não há término conhecido.
export const descreverTermino = cliente => {
  if (cliente.data_fim_contrato) {
    return formatarDataIso(cliente.data_fim_contrato)
  }

  return cliente.saiu_da_planilha_em ? `Saiu da planilha em ${formatarDataIso(cliente.saiu_da_planilha_em)}` : ''
}
