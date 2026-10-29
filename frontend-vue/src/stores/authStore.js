import { acceptHMRUpdate, defineStore } from 'pinia'
import { cadastrar, estaAutenticado, login, logout, nomeUsuario, papelUsuario, usuarioAtual } from '../services/api'
import { podeFazer, rotuloPapel, STATUS_CONTA } from '../utils/papeis'

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
    nome: nomeUsuario(),
    papel: papelUsuario()
  }),

  getters: {
    // "Ana Lima" -> "AL"; nome de uma palavra só -> duas primeiras letras
    iniciais: state => {
      const partes = (state.nome || 'Usuário').split(' ').filter(Boolean)

      if (partes.length > 1) {
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
      }

      return partes[0].slice(0, 2).toUpperCase()
    },

    // "Analista", "Gestor" ou "Administrador" (Sidebar)
    rotuloPapel: state => rotuloPapel(state.papel),

    // Uso: auth.pode('importarPlanilha') — regras em utils/papeis.js
    pode: state => acao => podeFazer(state.papel, acao),

    // Quem fez uma ação (ex.: "Enviado por" no histórico de importação)
    responsavel: state => ({ nome: state.nome, email: state.email })
  },

  actions: {
    // Lança erro se o login falhar (a tela de login mostra a mensagem;
    // erro.status 403 + erro.codigo PENDENTE/REJEITADO = não aprovado)
    async entrar(email, senha) {
      await login(email, senha)
      this.recarregarSessao()
    },

    // Primeiro acesso: cria a conta. Ela fica aguardando aprovação de um
    // Administrador; só a primeira conta do sistema já nasce aprovada, e
    // nesse caso entra direto. Devolve a conta criada (com o status).
    // Lança erro se o cadastro falhar (erro.status 409 = e-mail já existe).
    async criarConta(nome, email, senha, papel) {
      const conta = await cadastrar(nome, email, senha, papel)

      if (conta.status === STATUS_CONTA.APROVADO) {
        await this.entrar(email, senha)
      }

      return conta
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
      this.papel = papelUsuario()
    }
  }
})

// Só em desenvolvimento: aplica mudanças deste arquivo sem recarregar a página
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
