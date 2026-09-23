import { defineStore } from 'pinia'
import {
  limparDados as limparDadosSalvos,
  listarClientes,
  listarHistorico,
  salvarClientes,
  salvarHistorico
} from '../services/api'

// Unifica grafias diferentes do mesmo segmento (o problema original do
// projeto: "IND.", "Industria", "INDUSTRIA" viravam 3 valores distintos).
//
// Em vez de listar cada variação (o exemplo da aula só cobria 3 segmentos e
// uma planilha real apareceu com "SAUDE"/"SAÚDE"/"EDUCACAO"/"EDUCAÇÃO" como
// 4 valores diferentes), a chave usada aqui já remove acento e pontuação
// antes de comparar — então "Saúde", "SAUDE", "saude." e "SAÚDE" caem todos
// na mesma entrada, sem precisar prever cada grafia possível.
const removerAcentos = texto => texto.normalize('NFD').replace(/[̀-ͯ]/g, '')

const chaveSegmento = valor => {
  return removerAcentos(String(valor || '').trim().toUpperCase()).replace(/\.$/, '')
}

const MAPA_SEGMENTOS = {
  'IND': 'Indústria',
  'INDUSTRIA': 'Indústria',
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

// Segmento que não está no mapa (uma categoria nova que ainda não previmos)
// não fica gritando em CAIXA ALTA pra sempre — cai pra "Primeira Maiúscula",
// pelo menos apresentável, até alguém adicionar a entrada certa no mapa.
const capitalizarPalavras = valor => {
  return valor
    .toLowerCase()
    .replace(/(^|\s)\S/g, letra => letra.toUpperCase())
}

// Aceita "aaaa-mm-dd" (ISO) ou "dd/mm/aaaa" e normaliza pra "aaaa-mm-dd",
// formato usado pelo Dashboard pra agrupar por período.
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

// Quando a célula já vem como número (Excel formatou como moeda mas o valor
// por baixo é numérico), usa direto. Quando vem como texto — "R$ 1.850.000,00"
// — remove tudo que não é dígito/vírgula, tira o ponto de milhar e troca a
// vírgula decimal por ponto, pra não virar NaN.
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

// Excel em português-BR exporta CSV com ";" (a vírgula já é separador
// decimal por lá). Detecta pelo cabeçalho em vez de forçar um fixo.
const detectarDelimitador = primeiraLinha => {
  const qtdPontoVirgula = (primeiraLinha.match(/;/g) || []).length
  const qtdVirgula = (primeiraLinha.match(/,/g) || []).length
  return qtdPontoVirgula > qtdVirgula ? ';' : ','
}

// CSV também vira uma lista de objetos com o nome da coluna como chave —
// igual ao que o XLSX.utils.sheet_to_json já faz pra planilhas Excel —
// pra alimentar tratarLinha() do mesmo jeito nos dois formatos.
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

export const useUploadStore = defineStore('upload', {
  state: () => ({
    arquivo: null,
    dadosOriginais: [],
    dadosTratados: [],
    erros: [],
    carregando: false,

    // Telemetria: histórico de uploads (persistido pelo serviço, sobrevive
    // a recarregar a página — diferente de dadosTratados, que é só o
    // resultado do último arquivo processado nesta sessão). Começa vazio e
    // é preenchido por carregarHistorico().
    historico: []
  }),

  getters: {
    totalClientes: state => state.dadosTratados.length,

    totalErros: state => state.erros.length,

    clientesNivelA: state => {
      return state.dadosTratados.filter(c => c.nivel_cliente === 'A').length
    },

    temDados: state => state.dadosTratados.length > 0
  },

  actions: {
    selecionarArquivo(file) {
      this.arquivo = file
      this.erros = []
    },

    validarArquivo() {
      if (!this.arquivo) {
        this.erros.push('Selecione uma planilha.')
        return false
      }

      const nome = this.arquivo.name.toLowerCase()
      const valido = nome.endsWith('.xlsx') || nome.endsWith('.xls') || nome.endsWith('.csv')

      if (!valido) {
        this.erros.push('Formato inválido.')
      }

      return valido
    },

    // Limpa espaços, padroniza maiúsculas e unifica grafias de segmento e
    // consultor. ...linha preserva qualquer outro campo que a planilha real
    // tiver (ex.: cidade, uf), mesmo sem tratamento específico pra eles.
    //
    // Aceita tanto os nomes do exemplo da aula (faturamento, servico) quanto
    // os nomes reais que apareceram na planilha da CTI (faturamento_anual,
    // servicos_contratados) — sem exigir que a planilha use um nome exato.
    tratarLinha(linha) {
      const segmentoOriginal = String(linha.segmento || '').trim()
      const chaveSeg = chaveSegmento(segmentoOriginal)
      const segmentoTratado = MAPA_SEGMENTOS[chaveSeg] || capitalizarPalavras(segmentoOriginal)

      const consultorOriginal = String(linha.consultor || '').trim()
      const consultorTratado = consultorOriginal ? capitalizarPalavras(consultorOriginal) : ''

      // Um cliente pode ter mais de um serviço na mesma linha, separados por
      // ";" (ex.: "Internet Dedicada;Firewall"). Guarda os dois formatos:
      // "servico" como texto pra exibir em tabela, "servicos" como lista pra
      // quem precisa contar/repartir por serviço individual (Dashboard).
      const servicoBruto = String(linha.servicos_contratados ?? linha.servico ?? '').trim()
      const listaServicos = servicoBruto
        ? servicoBruto.split(';').map(s => s.trim()).filter(Boolean)
        : []

      return {
        ...linha,
        consultor: consultorTratado,
        codigo_cliente: String(linha.codigo_cliente || '').trim(),
        nome_cliente: String(linha.nome_cliente || '').trim(),
        segmento: segmentoTratado,
        nivel_cliente: String(linha.nivel_cliente || '').trim().toUpperCase(),
        faturamento: parseFaturamento(linha.faturamento_anual ?? linha.faturamento),
        data_contratacao: parseDataContratacao(linha.data_contratacao),
        servico: listaServicos.length ? listaServicos.join(', ') : null,
        servicos: listaServicos
      }
    },

    async processarPlanilha() {
      if (!this.validarArquivo()) {
        return
      }

      this.carregando = true

      // Registro provisório: o parse é assíncrono de verdade (arrayBuffer/
      // FileReader), então "PROCESSANDO" reflete um estado real, ainda que
      // rápido — não é decorativo.
      const registro = {
        id: Date.now(),
        tipoOperacao: 'UPLOAD',
        nomeArquivo: this.arquivo.name,
        dataHora: new Date().toISOString(),
        status: 'PROCESSANDO',
        linhasLidas: null,
        mensagem: ''
      }

      this.historico = [registro, ...this.historico]
      this.salvarHistorico()

      const ehPlanilhaExcel = /\.(xlsx|xls)$/i.test(this.arquivo.name)

      // "registro" é o objeto original, não a versão reativa que o Pinia
      // guardou ao fazer this.historico = [...]; buscamos de volta pelo id
      // antes de mutar, senão a tela não atualiza.
      const item = this.historico.find(r => r.id === registro.id)

      let conteudoParaDownload
      let nomeParaDownload = this.arquivo.name

      try {
        if (ehPlanilhaExcel) {
          // .xlsx/.xls são arquivos binários — não dá pra ler como texto
          // puro. Importa a SheetJS sob demanda, só quando precisa, pra não
          // pesar o carregamento inicial das outras telas.
          const XLSX = await import('xlsx')
          const buffer = await this.arquivo.arrayBuffer()
          const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
          const planilha = workbook.Sheets[workbook.SheetNames[0]]

          const linhasCruas = XLSX.utils.sheet_to_json(planilha, {
            raw: true,
            defval: ''
          })

          this.dadosOriginais = linhasCruas.map(linha => {
            const linhaTexto = {}
            Object.keys(linha).forEach(chave => {
              linhaTexto[chave] = celulaParaTexto(linha[chave])
            })
            return linhaTexto
          })

          conteudoParaDownload = XLSX.utils.sheet_to_csv(planilha)
          nomeParaDownload = this.arquivo.name.replace(/\.(xlsx|xls)$/i, '.csv')
        } else {
          const texto = await this.arquivo.text()
          this.dadosOriginais = linhasCsvParaObjetos(texto)
          conteudoParaDownload = texto
        }
      } catch (erro) {
        item.status = 'ERRO_SCHEMA'
        item.linhasLidas = 0
        item.mensagem = 'Não foi possível ler o arquivo. Confira se o formato não está corrompido.'
        this.salvarHistorico()
        this.carregando = false
        console.error('Erro ao processar planilha:', erro)
        return
      }

      this.dadosTratados = this.dadosOriginais.map(this.tratarLinha)

      // Validação real: um cliente sem nome nem código não é um cliente —
      // planilha sem essa informação básica não entra na base.
      const linhaInvalida = cliente => !cliente.nome_cliente && !cliente.codigo_cliente
      const invalidos = this.dadosTratados.filter(linhaInvalida)

      if (this.dadosTratados.length === 0) {
        item.status = 'ERRO_SCHEMA'
        item.linhasLidas = 0
        item.mensagem = 'Nenhuma linha de dados encontrada no arquivo.'
        item.conteudoOriginal = conteudoParaDownload
        item.nomeArquivoDownload = nomeParaDownload
        this.erros = [item.mensagem]
      } else if (invalidos.length > 0) {
        item.status = 'ERRO_SCHEMA'
        item.linhasLidas = this.dadosTratados.length
        item.mensagem = `${invalidos.length} de ${this.dadosTratados.length} linha(s) sem nome nem código de cliente.`
        item.conteudoOriginal = conteudoParaDownload
        item.nomeArquivoDownload = nomeParaDownload
        this.erros = [item.mensagem]
      } else {
        item.status = 'NORMALIZADO'
        item.linhasLidas = this.dadosTratados.length
        item.mensagem = ''
        this.erros = []

        // Só sobrescreve a base usada pelo Dashboard/Relatórios quando o
        // arquivo passou na validação — um upload com erro não deve apagar
        // a última base boa que já estava carregada.
        await salvarClientes(this.dadosTratados)
      }

      this.salvarHistorico()
      this.carregando = false
    },

    salvarHistorico() {
      return salvarHistorico(this.historico)
    },

    async carregarHistorico() {
      this.historico = await listarHistorico()
    },

    removerDoHistorico(id) {
      this.historico = this.historico.filter(item => item.id !== id)
      this.salvarHistorico()
    },

    // Só existe pra quem deu ERRO_SCHEMA (guardamos o conteúdo original só
    // nesse caso) — deixa reabrir o que foi enviado pra achar o problema.
    baixarOriginal(item) {
      if (!item.conteudoOriginal) {
        return
      }

      const blob = new Blob([item.conteudoOriginal], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = item.nomeArquivoDownload || item.nomeArquivo
      link.click()

      URL.revokeObjectURL(url)
    },

    // Carrega a última base já processada (ex.: ao abrir o Dashboard sem
    // ter feito upload nesta sessão do Pinia — o serviço já tem dado).
    async carregarClientesSalvos() {
      this.dadosTratados = await listarClientes()
    },

    async limparDados() {
      this.arquivo = null
      this.dadosOriginais = []
      this.dadosTratados = []
      this.erros = []
      this.historico = []
      await limparDadosSalvos()
    }
  }
})
