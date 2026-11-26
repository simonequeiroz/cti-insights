<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { CONTA_DEMO } from '../services/api'
import PainelInstitucional from '../components/PainelInstitucional.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const senha = ref('')
// "Esqueci minha senha": o sistema não envia e-mail; a tela orienta a
// procurar o administrador.
const mostrarAjudaSenha = ref(false)
const mostrarSenha = ref(false)
const erro = ref('')
const entrando = ref(false)

// O api.js manda para cá com ?motivo=sessao quando o Spring encerra a
// sessão (30 min sem uso ou servidor reiniciado): a tela explica por que
// pediu login de novo.
const sessaoExpirada = route.query.motivo === 'sessao'

// Só volta para caminhos internos (ex.: /relatorios). Qualquer outra coisa
// em ?redirect= (outro site, "//site", texto estranho) vai ao Dashboard.
const destinoSeguro = destino => {
  return typeof destino === 'string' && destino.startsWith('/') && !destino.startsWith('//') && !destino.startsWith('/\\')
    ? destino
    : '/dashboard'
}

// Entra com a conta de demonstração em um clique (só no modo simulado)
const entrarComContaDemo = () => {
  email.value = CONTA_DEMO.email
  senha.value = CONTA_DEMO.senha
  entrar()
}

// Senha certa, mas o cadastro ainda não foi aprovado (erro 403 do login)
const MENSAGENS_NAO_APROVADO = {
  PENDENTE: 'Seu cadastro ainda está aguardando a aprovação de um administrador.',
  REJEITADO: 'Seu cadastro não foi aprovado. Procure o administrador do sistema.'
}

const entrar = async () => {
  if (entrando.value) return
  erro.value = ''

  if (!email.value || !senha.value) {
    erro.value = 'Preencha o e-mail e a senha.'
    return
  }

  if (!email.value.includes('@')) {
    erro.value = 'Digite um e-mail válido.'
    return
  }

  // Só entra quem se cadastrou (/cadastro) e foi aprovado por um
  // Administrador (/usuarios); em modo mock, tudo neste navegador (veja
  // services/api.js). A guarda de rota e a Sidebar leem a sessão do authStore.
  // Botão desabilitado e "Entrando..." enquanto espera: o primeiro acesso
  // do dia pode demorar alguns segundos (o banco gratuito "acorda").
  entrando.value = true
  try {
    await auth.entrar(email.value, senha.value)
  } catch (falha) {
    // 401 = senha errada; 403 = cadastro não aprovado. Qualquer outra falha
    // (servidor fora do ar, erro interno) mostra o motivo real, para não
    // parecer que a senha está errada.
    if (falha.status === 403) {
      erro.value = MENSAGENS_NAO_APROVADO[falha.codigo] || MENSAGENS_NAO_APROVADO.PENDENTE
    } else if (falha.status === 401) {
      erro.value = 'E-mail ou senha inválidos.'
    } else {
      erro.value = falha.message || 'Não foi possível entrar. Tente novamente.'
    }
    return
  } finally {
    entrando.value = false
  }

  router.push(destinoSeguro(route.query.redirect))
}
</script>

<template>

  <main class="min-h-screen flex flex-col md:flex-row">

    <!-- Painel esquerdo: identidade e proposta de valor (público, sem formulário) -->
    <PainelInstitucional />

    <!-- Painel direito: formulário de login -->

    <div class="flex flex-1 flex-col items-center justify-start bg-white px-6 py-8 sm:py-16 md:justify-center">

      <RouterLink
        to="/"
        class="mb-4 flex w-full max-w-sm items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-[#006EB7]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Voltar para a página inicial
      </RouterLink>

      <div
        class="w-full max-w-sm rounded-xl border-t-4 border-[#FF8F00] bg-white p-6 shadow-lg ring-1 ring-gray-200 sm:p-9"
      >

        <h1 class="text-2xl font-bold text-[#292A2F]">
          Acesse sua conta
        </h1>

        <p class="mt-2 text-sm text-gray-500">
          Use o e-mail e a senha do seu cadastro.
        </p>

        <p
          v-if="sessaoExpirada"
          role="status"
          class="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Sua sessão foi encerrada, por exemplo, após 30 minutos sem uso. Entre de novo para continuar de onde parou.
        </p>

        <form
          @submit.prevent="entrar"
          class="mt-8 space-y-5"
        >

          <!-- E-mail -->

          <div>

            <label
              for="email"
              class="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#292A2F]"
            >
              E-mail
            </label>

            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="nome.sobrenome@empresa.com"
              class="w-full rounded-md border border-gray-300 px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#006EB7] focus:ring-2 focus:ring-[#006EB7]/10"
            />

          </div>

          <!-- Senha -->

          <div>

            <label
              for="password"
              class="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#292A2F]"
            >
              Senha
            </label>

            <div class="relative">

              <input
                id="password"
                v-model="senha"
                :type="mostrarSenha ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Digite sua senha"
                class="w-full rounded-md border border-gray-300 px-4 py-3 pr-11 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#006EB7] focus:ring-2 focus:ring-[#006EB7]/10"
              />

              <button
                type="button"
                @click="mostrarSenha = !mostrarSenha"
                :aria-label="mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
              >
                <svg
                  v-if="mostrarSenha"
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="1.7"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.243 4.243L9.88 9.88"
                  />
                </svg>
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="1.7"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
              </button>

            </div>

          </div>

          <!-- Esqueci minha senha: mostra a orientação logo abaixo -->

          <div class="text-right text-sm">
            <button
              type="button"
              :aria-expanded="mostrarAjudaSenha"
              class="font-medium text-[#006EB7] hover:underline"
              @click="mostrarAjudaSenha = !mostrarAjudaSenha"
            >
              Esqueci minha senha
            </button>
          </div>

          <p
            v-if="mostrarAjudaSenha"
            class="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-[#03558c]"
          >
            Por segurança, o sistema não envia senhas por e-mail. Fale com o
            administrador do CTI Insights da sua empresa.
          </p>

          <!-- Mensagem de erro -->

          <div
            v-if="erro"
            role="alert"
            class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {{ erro }}
          </div>

          <!-- Botão -->

          <button
            type="submit"
            :disabled="entrando"
            :aria-busy="entrando"
            class="flex w-full items-center justify-center gap-2 rounded-md bg-[#006EB7] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#03558c] disabled:cursor-wait disabled:opacity-80"
          >
            <svg
              v-if="entrando"
              class="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25" />
              <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            {{ entrando ? 'Entrando...' : 'Acessar Painel' }}
          </button>

        </form>

        <!-- Conta de demonstração: só no modo simulado (services/api.js) -->
        <p
          v-if="CONTA_DEMO"
          class="mt-6 text-center text-sm"
        >
          <button
            type="button"
            class="cursor-pointer font-semibold text-[#006EB7] hover:underline"
            @click="entrarComContaDemo"
          >
            Entrar com a conta de demonstração
          </button>
        </p>

        <!-- Leva o redirect junto: quem veio de uma tela protegida volta
             para ela depois de criar a conta -->
        <p class="mt-6 text-center text-sm text-gray-500">
          Primeiro acesso?
          <RouterLink
            :to="{ path: '/cadastro', query: route.query }"
            class="font-medium text-[#006EB7] hover:underline"
          >
            Criar conta
          </RouterLink>
        </p>

      </div>

    </div>

  </main>

</template>
