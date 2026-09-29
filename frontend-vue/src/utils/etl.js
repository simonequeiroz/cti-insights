// Tratamento das planilhas de clientes (o "ETL" do front-end): leitura de
// .xlsx/.xls/.csv, padronização, validação pelo dicionário de dados, CSV das
// linhas com erro e hash do arquivo. São funções puras, sem estado: quem
// guarda estado e conduz as etapas da importação é o uploadStore (Pinia).
// Separado do store para ficar fácil de testar e, no futuro, de comparar
// com o motor em Python/Pandas.

// Unifica grafias diferentes do mesmo segmento (o problema original do
// projeto: "IND.", "Industria", "INDUSTRIA" viravam 3 valores distintos).
// A chave remove acento e pontuação antes de comparar, então "Saúde",
// "SAUDE", "saude." e "SAÚDE" caem todos na mesma entrada.
const removerAcentos = texto => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const chaveSegmento = valor => {
  return removerAcentos(String(valor || '').trim().toUpperCase()).replace(/\.$/, '')
}

const MAPA_SEGMENTOS = {
  'IND': 'Indústria',
  'INDUSTRIA': 'Indústria',
  'COM': 'Comércio',
  'COMERCIO': 'Comércio',
  'SERVICOS': 'Serviços',
  'SAUDE': 'Saúde',
  'EDUCACAO': 'Educação',
  'TECNOLOGIA': 'Tecnologia',
  'VAREJO': 'Varejo',
  'AGRONEGOCIO': 'Agronegócio',
  'FINANCEIRO': 'Financeiro',
  'LOGISTICA': 'Logística'
}

// Segmento fora do mapa cai pra "Primeira Maiúscula" até alguém adicionar
// a entrada certa no mapa.
const capitalizarPalavras = valor => {
  return valor
    .toLowerCase()
    .replace(/(^|\s)\S/g, letra => letra.toUpperCase())
}

// Nome de empresa ou cidade: só mexe se veio TODO em maiúscula ou TODO em
// minúscula ("MERCADO CENTRAL" → "Mercado Central"). Se já veio misturado,
// respeita o que foi digitado, pra não estragar siglas como "CTI" ou "TI".
const padronizarSeTodoMaiusculoOuMinusculo = valor => {
  if (!valor) return valor
  const temLetra = /\p{L}/u.test(valor)
  const todoMaiusculo = valor === valor.toUpperCase()
  const todoMinusculo = valor === valor.toLowerCase()
  return temLetra && (todoMaiusculo || todoMinusculo) ? capitalizarPalavras(valor) : valor
}

// Aceita "aaaa-mm-dd" (ISO) ou "dd/mm/aaaa" e normaliza pra "aaaa-mm-dd".
const parseDataContratacao = valor => {
  const limpo = String(valor ?? '').trim()

  if (!limpo) {
    return null
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(limpo)) {
    return limpo
  }

  const match = limpo.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (match) {
    const [, dia, mes, ano] = match
    return `${ano}-${mes}-${dia}`
  }

  return null
}

// Número direto quando o Excel já entrega numérico; texto tipo
// "R$ 1.850.000,00" vira 1850000.
const parseFaturamento = valor => {
  if (valor === undefined || valor === null || valor === '') {
    return null
  }

  if (typeof valor === 'number') {
    return valor
  }

  const limpo = String(valor)
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const numero = Number(limpo)
  return Number.isNaN(numero) ? null : numero
}

// Excel em português-BR exporta CSV com ";". Detecta pelo cabeçalho.
const detectarDelimitador = primeiraLinha => {
  const qtdPontoVirgula = (primeiraLinha.match(/;/g) || []).length
  const qtdVirgula = (primeiraLinha.match(/,/g) || []).length
  return qtdPontoVirgula > qtdVirgula ? ';' : ','
}

const linhasCsvParaObjetos = texto => {
  const linhas = texto
    .trim()
    .split('\n')
    .map(linha => linha.trim())
    .filter(Boolean)

  if (linhas.length === 0) {
    return []
  }

  const delimitador = detectarDelimitador(linhas[0])
  const cabecalhos = linhas[0].split(delimitador).map(h => h.trim())

  return linhas.slice(1).map(linha => {
    const valores = linha.split(delimitador)
    const objeto = {}

    cabecalhos.forEach((cabecalho, indice) => {
      objeto[cabecalho] = valores[indice]?.trim() ?? ''
    })

    return objeto
  })
}

const celulaParaTexto = valor => {
  if (valor === undefined || valor === null) {
    return ''
  }

  if (valor instanceof Date) {
    const dia = String(valor.getDate()).padStart(2, '0')
    const mes = String(valor.getMonth() + 1).padStart(2, '0')
    const ano = valor.getFullYear()
    return `${dia}/${mes}/${ano}`
  }

  return valor
}

const ABAS_DE_CLIENTES = ['clientes', 'upload_clientes']

// Lê .xlsx/.xls/.csv e devolve as linhas como objetos { coluna: valor }.
export const lerArquivo = async arquivo => {
  if (/\.(xlsx|xls)$/i.test(arquivo.name)) {
    // SheetJS sob demanda, pra não pesar o carregamento das outras telas.
    const XLSX = await import('xlsx')
    const buffer = await arquivo.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    // Usa a aba de clientes se existir (modelo: "Clientes"; planilha da aula:
    // "upload_clientes"); senão, a primeira aba.
    const nomeAba = workbook.SheetNames.find(nome => ABAS_DE_CLIENTES.includes(nome.trim().toLowerCase())) || workbook.SheetNames[0]
    const planilha = workbook.Sheets[nomeAba]
    const linhasCruas = XLSX.utils.sheet_to_json(planilha, { raw: true, defval: '' })

    return linhasCruas.map(linha => {
      const linhaTexto = {}
      Object.keys(linha).forEach(chave => {
        linhaTexto[chave] = celulaParaTexto(linha[chave])
      })
      return linhaTexto
    })
  }

  return linhasCsvParaObjetos(await arquivo.text())
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------
const NIVEIS_VALIDOS = ['A', 'B', 'C']

// Regras do dicionário de dados (aba "dicionario_dados" da planilha da aula).
// "alias" é o nome alternativo aceito no cabeçalho.
const CAMPOS_VALIDADOS = [
  { rotulo: 'código do cliente', coluna: 'codigo_cliente', invalido: c => !c.codigo_cliente },
  { rotulo: 'nome do cliente', coluna: 'nome_cliente', invalido: c => !c.nome_cliente },
  { rotulo: 'consultor', coluna: 'consultor', invalido: c => !c.consultor },
  { rotulo: 'segmento', coluna: 'segmento', invalido: c => !c.segmento },
  { rotulo: 'nível (A, B ou C)', coluna: 'nivel_cliente', dica: 'use A, B ou C', invalido: c => !NIVEIS_VALIDOS.includes(c.nivel_cliente) },
  { rotulo: 'faturamento anual', coluna: 'faturamento_anual', alias: 'faturamento', dica: 'use só números, sem valor negativo', invalido: c => c.faturamento === null || c.faturamento < 0 },
  { rotulo: 'data de contratação', coluna: 'data_contratacao', dica: 'use dd/mm/aaaa ou aaaa-mm-dd', invalido: c => !c.data_contratacao },
  { rotulo: 'serviço', coluna: 'servicos_contratados', alias: 'servico', invalido: c => !c.servicos.length },
  // Opcional: só é erro se vier preenchida com algo que não é sigla de UF
  { rotulo: 'UF', coluna: 'uf', dica: 'use a sigla com 2 letras, ex.: SP', invalido: c => Boolean(c.uf) && !/^[A-Z]{2}$/.test(c.uf) }
]

// Limite de problemas detalhados guardados (armazenamento local é limitado);
// a contagem total continua exata.
const MAX_PROBLEMAS_DETALHADOS = 200

const descreverProblema = (campo, linhaOriginal) => {
  const bruto = linhaOriginal?.[campo.coluna] ?? (campo.alias ? linhaOriginal?.[campo.alias] : undefined)
  const valor = String(bruto ?? '').trim()

  if (!valor) {
    return 'vazio'
  }

  return campo.dica ? `"${valor}" é inválido (${campo.dica})` : `"${valor}" é inválido`
}

// Confere linha a linha. Número da linha = como aparece no Excel
// (cabeçalho é a 1, então o primeiro cliente é a 2).
// Código repetido: a primeira ocorrência vale, as seguintes viram erro
// (regra do dicionário: "validar duplicidade; manter único").
export const validarClientes = (clientes, originais) => {
  const problemas = []
  const linhasComErro = []
  const primeiraLinhaDoCodigo = new Map()
  let totalProblemas = 0

  clientes.forEach((cliente, indice) => {
    const descricoes = []

    const registrar = (campo, descricao) => {
      totalProblemas++
      descricoes.push(`${campo}: ${descricao}`)

      if (problemas.length < MAX_PROBLEMAS_DETALHADOS) {
        problemas.push({ linha: indice + 2, campo, descricao })
      }
    }

    CAMPOS_VALIDADOS
      .filter(campo => campo.invalido(cliente))
      .forEach(campo => registrar(campo.rotulo, descreverProblema(campo, originais[indice])))

    const codigo = cliente.codigo_cliente.toUpperCase()

    if (codigo) {
      if (primeiraLinhaDoCodigo.has(codigo)) {
        registrar('código do cliente', `"${cliente.codigo_cliente}" repetido (já usado na linha ${primeiraLinhaDoCodigo.get(codigo)})`)
      } else {
        primeiraLinhaDoCodigo.set(codigo, indice + 2)
      }
    }

    if (descricoes.length) {
      linhasComErro.push({
        indice,
        linha: indice + 2,
        problemas: descricoes.join(' | '),
        original: originais[indice]
      })
    }
  })

  return { problemas, totalProblemas, linhasComErro }
}

// CSV (separado por ";", abre direto no Excel BR) só com as linhas que
// precisam de ajuste, com a coluna "problema" na frente.
export const gerarCsvLinhasComErro = linhasComErro => {
  const colunas = [...new Set(linhasComErro.flatMap(item => Object.keys(item.original || {})))]
  const escapar = valor => `"${String(valor ?? '').replace(/"/g, '""')}"`

  const cabecalho = ['linha_na_planilha', 'problema', ...colunas].map(escapar).join(';')
  const corpo = linhasComErro.map(item => {
    return [item.linha, item.problemas, ...colunas.map(coluna => item.original?.[coluna])]
      .map(escapar)
      .join(';')
  })

  // \ufeff (BOM) faz o Excel reconhecer os acentos
  return '\ufeff' + [cabecalho, ...corpo].join('\n')
}

export const baixarCsv = (conteudo, nome) => {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.click()

  URL.revokeObjectURL(url)
}

export const nomeArquivoErros = nomeArquivo => nomeArquivo.replace(/\.(xlsx|xls|csv)$/i, '') + '_linhas-com-erro.csv'

// "Impressão digital" do conteúdo do arquivo (SHA-256). Mesma planilha
// renomeada gera o mesmo hash; planilhas diferentes com o mesmo nome, não.
// crypto.subtle só existe em contexto seguro (https ou localhost): fora
// disso devolve null e a checagem de duplicidade é pulada.
export const calcularHash = async arquivo => {
  try {
    if (!globalThis.crypto?.subtle) return null
    const digest = await crypto.subtle.digest('SHA-256', await arquivo.arrayBuffer())
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

export const TAMANHO_MAXIMO_MB = 20
export const TAMANHO_MAXIMO_BYTES = TAMANHO_MAXIMO_MB * 1024 * 1024

export const formatarTamanho = bytes => {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

// Limpa espaços, padroniza maiúsculas e unifica grafias. Guarda em
// etl_original o valor original de cada campo que foi corrigido.
export const tratarLinha = linha => {
  const segmentoOriginal = String(linha.segmento || '').trim()
  const chaveSeg = chaveSegmento(segmentoOriginal)
  const segmentoTratado = MAPA_SEGMENTOS[chaveSeg] || capitalizarPalavras(segmentoOriginal)

  const nomeOriginal = String(linha.nome_cliente || '').trim()
  const nomeTratado = padronizarSeTodoMaiusculoOuMinusculo(nomeOriginal)

  const cidadeOriginal = String(linha.cidade || '').trim()
  const cidadeTratada = padronizarSeTodoMaiusculoOuMinusculo(cidadeOriginal)

  const ufTratada = String(linha.uf || '').trim().toUpperCase()

  const consultorOriginal = String(linha.consultor || '').trim()
  const consultorTratado = consultorOriginal ? capitalizarPalavras(consultorOriginal) : ''

  // Vários serviços na mesma célula, separados por ";"
  const servicoBruto = String(linha.servicos_contratados ?? linha.servico ?? '').trim()
  const listaServicos = servicoBruto
    ? servicoBruto.split(';').map(s => s.trim()).filter(Boolean)
    : []

  const nivelOriginal = String(linha.nivel_cliente || '').trim()
  const nivelTratado = nivelOriginal.toUpperCase()

  const dataOriginal = String(linha.data_contratacao ?? '').trim()
  const dataTratada = parseDataContratacao(linha.data_contratacao)

  const faturamentoOriginal = linha.faturamento_anual ?? linha.faturamento
  const faturamentoTratado = parseFaturamento(faturamentoOriginal)

  const etlOriginal = {}

  if (segmentoOriginal !== segmentoTratado) etlOriginal.segmento = segmentoOriginal
  if (consultorOriginal !== consultorTratado) etlOriginal.consultor = consultorOriginal
  if (nomeOriginal !== nomeTratado) etlOriginal.nome_cliente = nomeOriginal
  if (cidadeOriginal !== cidadeTratada) etlOriginal.cidade = cidadeOriginal
  if (nivelOriginal !== nivelTratado) etlOriginal.nivel_cliente = nivelOriginal
  if (dataTratada && dataOriginal !== dataTratada) etlOriginal.data_contratacao = dataOriginal

  if (typeof faturamentoOriginal === 'string' && faturamentoTratado !== null && faturamentoOriginal.trim() !== String(faturamentoTratado)) {
    etlOriginal.faturamento = faturamentoOriginal.trim()
  }

  return {
    ...linha,
    consultor: consultorTratado,
    codigo_cliente: String(linha.codigo_cliente || '').trim(),
    nome_cliente: nomeTratado,
    cidade: cidadeTratada || null,
    uf: ufTratada || null,
    segmento: segmentoTratado,
    nivel_cliente: nivelTratado,
    faturamento: faturamentoTratado,
    data_contratacao: dataTratada,
    servico: listaServicos.length ? listaServicos.join(', ') : null,
    servicos: listaServicos,
    etl_original: etlOriginal
  }
}
