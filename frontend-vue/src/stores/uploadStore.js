import { acceptHMRUpdate, defineStore } from 'pinia'
import {
  esperarSimulado,
  limparDados as limparDadosSalvos,
  listarHistorico,
  salvarHistorico
} from '../services/api'
import { useAuthStore } from './authStore'
import { useClientesStore } from './clientesStore'

// ---------------------------------------------------------------------------
// REGRA DE NEGÓCIO (decidir em grupo)
// true  → importa as linhas válidas e ignora as com erro (o consultor vê
//         quais foram ignoradas e pode baixar só elas pra corrigir).
// false → qualquer linha com erro bloqueia a importação da planilha inteira.
// ---------------------------------------------------------------------------
export const PERMITIR_IMPORTACAO_PARCIAL = true

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
const lerArquivo = async arquivo => {
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
const validarClientes = (clientes, originais) => {
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
const gerarCsvLinhasComErro = linhasComErro => {
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

const baixarCsv = (conteudo, nome) => {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.click()

  URL.revokeObjectURL(url)
}

const nomeArquivoErros = nomeArquivo => nomeArquivo.replace(/\.(xlsx|xls|csv)$/i, '') + '_linhas-com-erro.csv'

// "Impressão digital" do conteúdo do arquivo (SHA-256). Mesma planilha
// renomeada gera o mesmo hash; planilhas diferentes com o mesmo nome, não.
// crypto.subtle só existe em contexto seguro (https ou localhost): fora
// disso devolve null e a checagem de duplicidade é pulada.
const calcularHash = async arquivo => {
  try {
    if (!globalThis.crypto?.subtle) return null
    const digest = await crypto.subtle.digest('SHA-256', await arquivo.arrayBuffer())
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

// Quem está fazendo o envio: vem da sessão (authStore). Chamada só dentro
// das actions, quando o Pinia já está ativo.
const responsavelAtual = () => useAuthStore().responsavel

export const TAMANHO_MAXIMO_MB = 20
const TAMANHO_MAXIMO_BYTES = TAMANHO_MAXIMO_MB * 1024 * 1024

export const formatarTamanho = bytes => {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

export const useUploadStore = defineStore('upload', {
  state: () => ({
    arquivo: null,
    erros: [],
    carregando: false,

    // Resultado da etapa "Revisar": planilha lida, padronizada e validada,
    // mas AINDA NÃO salva. Só vira base em confirmarImportacao().
    analise: null,

    // Histórico de envios (persistido pelo serviço)
    historico: []
  }),

  getters: {
    totalErros: state => state.erros.length,

    // Registro do histórico que gerou a base atual
    origemBaseAtual: state => {
      return state.historico.find(item => item.status === 'NORMALIZADO') || null
    },

    // A análise atual pode ser importada?
    podeConfirmar: state => {
      const analise = state.analise

      if (!analise || !analise.validos.length) {
        return false
      }

      return PERMITIR_IMPORTACAO_PARCIAL || analise.linhasComErro.length === 0
    }
  },

  actions: {
    // Etapa 1 — escolher arquivo: valida formato e tamanho na hora.
    selecionarArquivo(file) {
      this.arquivo = file
      this.analise = null
      this.validarArquivo()
    },

    descartarArquivo() {
      this.arquivo = null
      this.analise = null
      this.erros = []
    },

    validarArquivo() {
      this.erros = []

      if (!this.arquivo) {
        this.erros.push('Selecione uma planilha.')
        return false
      }

      const nome = this.arquivo.name.toLowerCase()
      const formatoValido = nome.endsWith('.xlsx') || nome.endsWith('.xls') || nome.endsWith('.csv')

      if (!formatoValido) {
        this.erros.push('Formato inválido. Envie um arquivo .xlsx, .xls ou .csv.')
        return false
      }

      if (this.arquivo.size > TAMANHO_MAXIMO_BYTES) {
        this.erros.push(`Arquivo muito grande (${formatarTamanho(this.arquivo.size)}). O limite é ${TAMANHO_MAXIMO_MB} MB.`)
        return false
      }

      return true
    },

    // Limpa espaços, padroniza maiúsculas e unifica grafias. Guarda em
    // etl_original o valor original de cada campo que foi corrigido.
    tratarLinha(linha) {
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
    },

    // Etapa 2 — ANALISAR: lê, padroniza, valida e compara com a base atual.
    // Não salva nada. Devolve a análise, ou null se não deu pra ler.
    async analisarPlanilha() {
      if (this.carregando || !this.validarArquivo()) {
        return null
      }

      this.carregando = true
      this.analise = null

      try {
        // Só em desenvolvimento, se ctiDelayUpload estiver definido (README)
        await esperarSimulado()

        let originais

        try {
          originais = await lerArquivo(this.arquivo)
        } catch (erro) {
          console.error('Erro ao ler planilha:', erro)
          this.registrarFalha('Não foi possível ler o arquivo. Confira se ele abre no Excel e envie novamente.')
          return null
        }

        if (originais.length === 0) {
          this.registrarFalha('Nenhuma linha de dados encontrada. Confira se a planilha tem o cabeçalho e ao menos um cliente.')
          return null
        }

        // Mesma planilha (mesmo conteúdo) já importada antes?
        const hashArquivo = await calcularHash(this.arquivo)
        const anterior = hashArquivo
          ? this.historico.find(item => item.status === 'NORMALIZADO' && item.hashArquivo === hashArquivo)
          : null

        const tratados = originais.map(linha => this.tratarLinha(linha))
        const validacao = validarClientes(tratados, originais)
        const indicesComErro = new Set(validacao.linhasComErro.map(item => item.indice))
        const validos = tratados.filter((_, indice) => !indicesComErro.has(indice))

        // Comparação com a base atual (pelo código do cliente)
        const baseAtual = useClientesStore().lista
        const codigosAnteriores = new Set(baseAtual.map(c => c.codigo_cliente))
        const codigosNovos = new Set(validos.map(c => c.codigo_cliente))
        const clientesNovos = [...codigosNovos].filter(c => !codigosAnteriores.has(c)).length

        this.analise = {
          nomeArquivo: this.arquivo.name,
          tamanho: this.arquivo.size,
          linhasLidas: tratados.length,
          validos,
          linhasComErro: validacao.linhasComErro,
          problemas: validacao.problemas,
          totalProblemas: validacao.totalProblemas,
          clientesNovos,
          clientesAtualizados: codigosNovos.size - clientesNovos,
          clientesRemovidos: [...codigosAnteriores].filter(c => !codigosNovos.has(c)).length,
          baseAnterior: baseAtual.length,
          hashArquivo,
          importacaoAnterior: anterior
            ? { nomeArquivo: anterior.nomeArquivo, dataHora: anterior.dataHora, enviadoPor: anterior.enviadoPor || null }
            : null
        }

        return this.analise
      } finally {
        this.carregando = false
      }
    },

    // Volta da revisão sem importar nada
    cancelarAnalise() {
      this.analise = null
      this.arquivo = null
      this.erros = []
    },

    // Planilha só com as linhas que precisam de ajuste (etapa Revisar)
    baixarLinhasComErro() {
      if (!this.analise?.linhasComErro.length) {
        return
      }

      baixarCsv(gerarCsvLinhasComErro(this.analise.linhasComErro), nomeArquivoErros(this.analise.nomeArquivo))
    },

    // Etapa 3 — CONFIRMAR: agora sim substitui a base e registra no histórico.
    async confirmarImportacao() {
      if (this.carregando || !this.podeConfirmar) {
        return null
      }

      this.carregando = true
      const analise = this.analise
      const ignoradas = analise.linhasComErro.length

      try {
        await useClientesStore().substituirBase(analise.validos)

        const item = {
          id: Date.now(),
          tipoOperacao: 'UPLOAD',
          nomeArquivo: analise.nomeArquivo,
          dataHora: new Date().toISOString(),
          status: 'NORMALIZADO',
          enviadoPor: responsavelAtual(),
          hashArquivo: analise.hashArquivo,
          reimportacao: Boolean(analise.importacaoAnterior),
          linhasLidas: analise.linhasLidas,
          linhasImportadas: analise.validos.length,
          linhasIgnoradas: ignoradas,
          clientesNovos: analise.clientesNovos,
          clientesAtualizados: analise.clientesAtualizados,
          clientesRemovidos: analise.clientesRemovidos,
          mensagem: ignoradas ? `${ignoradas} linha(s) com erro não foram importadas.` : '',
          problemas: analise.problemas,
          totalProblemas: analise.totalProblemas,
          // Usado pelo botão de download do histórico (baixarOriginal)
          conteudoOriginal: ignoradas ? gerarCsvLinhasComErro(analise.linhasComErro) : undefined,
          nomeArquivoDownload: ignoradas ? nomeArquivoErros(analise.nomeArquivo) : undefined
        }

        this.historico = [item, ...this.historico]
        await this.salvarHistorico()

        this.analise = null
        this.arquivo = null
        this.erros = []
        return item
      } catch (erro) {
        // Ex.: estourou o limite do armazenamento local do navegador
        console.error('Erro ao salvar a base:', erro)
        this.erros = ['Não foi possível salvar a base neste navegador (arquivo grande demais para o armazenamento local). Envie uma planilha menor.']
        return null
      } finally {
        this.carregando = false
      }
    },

    // Arquivo que nem chegou na revisão (ilegível ou vazio)
    registrarFalha(mensagem) {
      this.erros = [mensagem]

      this.historico = [{
        id: Date.now(),
        tipoOperacao: 'UPLOAD',
        nomeArquivo: this.arquivo?.name || 'arquivo',
        dataHora: new Date().toISOString(),
        status: 'ERRO_SCHEMA',
        enviadoPor: responsavelAtual(),
        linhasLidas: 0,
        mensagem
      }, ...this.historico]

      this.salvarHistorico()
    },

    // Nunca lança erro: se o armazenamento estiver cheio, tenta de novo sem
    // o conteúdo dos downloads (a parte mais pesada).
    async salvarHistorico() {
      try {
        await salvarHistorico(this.historico)
      } catch {
        try {
          const leve = this.historico.map(item => ({ ...item, conteudoOriginal: undefined }))
          await salvarHistorico(leve)
        } catch (erro) {
          console.warn('Não foi possível salvar o histórico:', erro)
        }
      }
    },

    async carregarHistorico() {
      this.historico = await listarHistorico()

      // Registros antigos que ficaram presos em PROCESSANDO
      if (!this.carregando) {
        let mudou = false

        this.historico.forEach(item => {
          if (item.status === 'PROCESSANDO') {
            item.status = 'ERRO_SCHEMA'
            item.linhasLidas = 0
            item.mensagem = 'Processamento interrompido (a página foi recarregada ou fechada). Envie o arquivo novamente.'
            mudou = true
          }
        })

        if (mudou) {
          await this.salvarHistorico()
        }
      }
    },

    removerDoHistorico(id) {
      this.historico = this.historico.filter(item => item.id !== id)
      this.salvarHistorico()
    },

    baixarOriginal(item) {
      if (!item.conteudoOriginal) {
        return
      }

      baixarCsv(item.conteudoOriginal, item.nomeArquivoDownload || item.nomeArquivo)
    },

    // Ferramenta de teste (Relatórios → "Limpar dados locais"): apaga a
    // base e o histórico do armazenamento e da memória.
    async limparDados() {
      await limparDadosSalvos()
      this.arquivo = null
      this.analise = null
      this.erros = []
      this.historico = []
      useClientesStore().esvaziar()
    }
  }
})

// Só em desenvolvimento (npm run dev): quando este arquivo muda, o Vite troca
// as actions/getters do store na hora, sem recarregar a página. Sem isso o
// Pinia continuava usando a versão antiga que já estava na memória.
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUploadStore, import.meta.hot))
}
