import { acceptHMRUpdate, defineStore } from 'pinia'
import { estaAutenticado, login, logout, nomeUsuario, usuarioAtual } from '../services/api'

// Sessão do usuário. O services/api.js continua sendo quem guarda a sessão
// (localStorage no modo mock; token/cookie quando houver back-end); este
// store é a fonte única e reativa que as telas leem. Antes, Login, Sidebar,
// guarda de rota e uploadStore liam o localStorage cada um por conta
// própria, e nada na tela reagia a uma mudança de sessão.
export const useAuthStore = defineStore('auth', {
  // Começa com a sessão que já estava salva: recarregar a página não desloga.
  state: () => ({
    autenticado: estaAutenticado(),
    email: usuarioAtual(),
    nome: nomeUsuario()
  }),

  getters: {
    // "Ana Lima" -> "AL"; nome de uma palavra só -> duas primeiras letras
    iniciais: state => {
      const partes = (state.nome || 'Consultor').split(' ').filter(Boolean)

      if (partes.length > 1) {
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
      }

      return partes[0].slice(0, 2).toUpperCase()
    },

    // Quem fez uma ação (ex.: "Enviado por" no histórico de importação)
    responsavel: state => ({ nome: state.nome, email: state.email })
  },

  actions: {
    // Lança erro se o login falhar (a tela de login mostra a mensagem)
    async entrar(email, senha) {
      await login(email, senha)
      this.recarregarSessao()
    },

    async sair() {
      try {
        await logout()
      } finally {
        // Mesmo se a API falhar, a sessão local já foi apagada pelo serviço
        this.recarregarSessao()
      }
    },

    recarregarSessao() {
      this.autenticado = estaAutenticado()
      this.email = usuarioAtual()
      this.nome = nomeUsuario()
    }
  }
})

// Só em desenvolvimento: aplica mudanças deste arquivo sem recarregar a página
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
