<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import PainelInstitucional from '../components/PainelInstitucional.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const senha = ref('')
const lembrar = ref(false)
const mostrarSenha = ref(false)
const erro = ref('')

// Senha certa, mas o cadastro ainda não foi aprovado (erro 403 do login)
const MENSAGENS_NAO_APROVADO = {
  PENDENTE: 'Seu cadastro ainda está aguardando a aprovação de um administrador.',
  REJEITADO: 'Seu cadastro não foi aprovado. Procure o administrador do sistema.'
}

const entrar = async () => {
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
  try {
    await auth.entrar(email.value, senha.value)
  } catch (falha) {
    erro.value = falha.status === 403
      ? MENSAGENS_NAO_APROVADO[falha.codigo] || MENSAGENS_NAO_APROVADO.PENDENTE
      : 'E-mail ou senha inválidos.'
    return
  }

  router.push(route.query.redirect || '/dashboard')
}
</script>

<template>

  <main class="min-h-screen flex flex-col md:flex-row">

    <!-- Painel esquerdo: identidade e proposta de valor (público, sem formulário) -->
    <PainelInstitucional />

    <!-- Painel direito: formulário de login -->

    <div class="flex flex-1 flex-col items-center justify-center bg-white px-6 py-8 sm:py-16">

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
          Bem-vindo de volta!
        </h1>

        <p class="mt-2 text-sm text-gray-500">
          Faça login para acessar sua conta.
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

          <!-- Lembrar acesso / Esqueci minha senha (cada um sem quebrar no
               meio; em tela muito estreita o link desce para a linha de baixo) -->

          <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 whitespace-nowrap text-sm">

            <label class="flex items-center gap-2 text-gray-600">
              <input
                v-model="lembrar"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-[#006EB7] focus:ring-[#006EB7]/30"
              />
              Lembrar acesso
            </label>

            <button
              type="button"
              class="font-medium text-[#006EB7] hover:underline"
            >
              Esqueci minha senha
            </button>

          </div>

          <!-- Mensagem de erro -->

          <div
            v-if="erro"
            class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600"
          >
            {{ erro }}
          </div>

          <!-- Botão -->

          <button
            type="submit"
            class="w-full rounded-md bg-[#006EB7] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#03558c]"
          >
            Acessar Painel
          </button>

        </form>

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
