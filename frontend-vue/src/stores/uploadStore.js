import { acceptHMRUpdate, defineStore } from 'pinia'
import {
  esperarSimulado,
  limparDados as limparDadosSalvos,
  listarHistorico,
  salvarHistorico
} from '../services/api'
import { useAuthStore } from './authStore'
import { useClientesStore } from './clientesStore'
import {
  baixarCsv,
  calcularHash,
  formatarTamanho,
  gerarCsvLinhasComErro,
  lerArquivo,
  nomeArquivoErros,
  TAMANHO_MAXIMO_BYTES,
  TAMANHO_MAXIMO_MB,
  tratarLinha,
  validarClientes
} from '../utils/etl'

// ---------------------------------------------------------------------------
// REGRA DE NEGÓCIO (decidir em grupo)
// true  → importa as linhas válidas e ignora as com erro (o consultor vê
//         quais foram ignoradas e pode baixar só elas pra corrigir).
// false → qualquer linha com erro bloqueia a importação da planilha inteira.
// ---------------------------------------------------------------------------
export const PERMITIR_IMPORTACAO_PARCIAL = true

// Quem está fazendo o envio: vem da sessão (authStore). Chamada só dentro
// das actions, quando o Pinia já está ativo.
const responsavelAtual = () => useAuthStore().responsavel

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

        const tratados = originais.map(linha => tratarLinha(linha))
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
