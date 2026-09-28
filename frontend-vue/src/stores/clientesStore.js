import { acceptHMRUpdate, defineStore } from 'pinia'
import { listarClientes, salvarClientes } from '../services/api'

// Base de clientes em uso (a última importação confirmada). Antes, Dashboard,
// Relatórios e uploadStore tinham cada um a sua cópia, carregada por conta
// própria; agora todos leem daqui e a importação troca a base aqui.
export const useClientesStore = defineStore('clientes', {
  state: () => ({
    lista: [],
    // true depois do primeiro carregamento (lista vazia = base vazia de
    // verdade, e não "ainda não carregou")
    carregado: false
  }),

  getters: {
    total: state => state.lista.length,
    temDados: state => state.lista.length > 0
  },

  actions: {
    // Busca a base no serviço (localStorage no mock; GET /clientes na API).
    // As telas chamam ao abrir; enquanto busca, mostram a lista que já têm.
    async carregar() {
      this.lista = await listarClientes()
      this.carregado = true
    },

    // Importação confirmada: grava a nova base e atualiza todas as telas.
    // Se salvar falhar (ex.: armazenamento cheio), a base atual continua.
    async substituirBase(clientes) {
      await salvarClientes(clientes)
      this.lista = clientes
      this.carregado = true
    },

    // Só zera a memória; quem apaga o armazenamento é o uploadStore
    // (limparDados), que também zera o histórico.
    esvaziar() {
      this.lista = []
    }
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useClientesStore, import.meta.hot))
}
