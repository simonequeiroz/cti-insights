<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import PainelInstitucional from '../components/PainelInstitucional.vue'
import { PAPEIS, rotuloPapel, STATUS_CONTA } from '../utils/papeis'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const SENHA_MINIMA = 8

const nome = ref('')
const email = ref('')
const papel = ref('')
const senha = ref('')
const confirmarSenha = ref('')
const mostrarSenha = ref(false)
const erro = ref('')
const enviando = ref(false)

// Conta criada que ficou aguardando aprovação: troca o formulário pela
// mensagem de "cadastro enviado"
const contaPendente = ref(null)

const descricaoPapel = computed(() => PAPEIS.find(item => item.valor === papel.value)?.descricao || '')

// Confere o formulário e devolve a mensagem do primeiro problema
// (ou '' se estiver tudo certo).
const validar = () => {
  if (!nome.value.trim() || !email.value || !papel.value || !senha.value || !confirmarSenha.value) {
    return 'Preencha todos os campos.'
  }

  // Nome e sobrenome: é o que aparece na Sidebar e no histórico de envios
  if (nome.value.trim().split(/\s+/).length < 2) {
    return 'Digite seu nome e sobrenome.'
  }

  if (!email.value.includes('@')) {
    return 'Digite um e-mail válido.'
  }

  if (senha.value.length < SENHA_MINIMA) {
    return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`
  }

  if (senha.value !== confirmarSenha.value) {
    return 'As senhas não conferem.'
  }

  return ''
}

const criarConta = async () => {
  erro.value = validar()

  if (erro.value || enviando.value) {
    return
  }

  enviando.value = true

  // Cria a conta (authStore.criarConta). Ela fica aguardando aprovação de
  // um Administrador; só a primeira conta do sistema já entra direto. Em
  // modo mock a conta fica salva neste navegador (veja services/api.js).
  let conta

  try {
    conta = await auth.criarConta(nome.value, email.value, senha.value, papel.value)
  } catch (falha) {
    erro.value = falha.status === 409
      ? 'Este e-mail já tem cadastro. Faça login para entrar.'
      : 'Não foi possível criar a conta. Tente novamente.'
    return
  } finally {
    enviando.value = false
  }

  if (conta.status === STATUS_CONTA.PENDENTE) {
    contaPendente.value = conta
    return
  }

  router.push(route.query.redirect || '/dashboard')
}
</script>

<template>

  <main class="min-h-screen flex flex-col md:flex-row">

    <!-- Painel esquerdo: identidade e proposta de valor (o mesmo do login) -->
    <PainelInstitucional />

    <!-- Painel direito: formulário de cadastro (primeiro acesso) -->

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

        <!-- Cadastro enviado: aguardando aprovação de um Administrador -->

        <div
          v-if="contaPendente"
          role="status"
        >

          <div class="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF4E5] text-xl text-[#A85700]" aria-hidden="true">
            ⏳
          </div>

          <h1 class="mt-5 text-2xl font-bold text-[#292A2F]">
            Cadastro enviado!
          </h1>

          <p class="mt-3 text-sm leading-relaxed text-gray-600">
            Sua conta de <strong>{{ rotuloPapel(contaPendente.papel) }}</strong>
            ({{ contaPendente.email }}) está <strong>aguardando aprovação</strong>
            de um administrador. Você poderá entrar assim que ela for aprovada.
          </p>

          <RouterLink
            to="/login"
            class="mt-8 block w-full rounded-md bg-[#006EB7] px-5 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[#03558c]"
          >
            Ir para o login
          </RouterLink>

        </div>

        <template v-else>

          <h1 class="text-2xl font-bold text-[#292A2F]">
            Primeiro acesso
          </h1>

          <p class="mt-2 text-sm text-gray-500">
            Crie sua conta. Um administrador aprova o acesso antes do primeiro login.
          </p>

          <form
            @submit.prevent="criarConta"
            novalidate
            class="mt-8 space-y-5"
          >

            <!-- Nome completo -->

            <div>

              <label
                for="nome"
                class="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#292A2F]"
              >
                Nome completo
              </label>

              <input
                id="nome"
                v-model="nome"
                type="text"
                autocomplete="name"
                placeholder="Nome e sobrenome"
                class="w-full rounded-md border border-gray-300 px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#006EB7] focus:ring-2 focus:ring-[#006EB7]/10"
              />

            </div>

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

            <!-- Papel: define o que a pessoa pode fazer (utils/papeis.js).
                 O administrador confere e pode ajustar antes de aprovar. -->

            <div>

              <label
                for="papel"
                class="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#292A2F]"
              >
                Papel
              </label>

              <select
                id="papel"
                v-model="papel"
                aria-describedby="dica-papel"
                class="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#006EB7] focus:ring-2 focus:ring-[#006EB7]/10"
                :class="papel ? 'text-gray-700' : 'text-gray-400'"
              >
                <option value="" disabled>Selecione seu papel</option>
                <option
                  v-for="item in PAPEIS"
                  :key="item.valor"
                  :value="item.valor"
                  class="text-gray-700"
                >
                  {{ item.rotulo }}
                </option>
              </select>

              <p
                id="dica-papel"
                class="mt-2 text-xs text-gray-500"
              >
                {{ descricaoPapel || 'O papel define o que você pode fazer no sistema.' }}
              </p>

            </div>

            <!-- Senha -->

            <div>

              <label
                for="senha"
                class="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#292A2F]"
              >
                Senha
              </label>

              <div class="relative">

                <input
                  id="senha"
                  v-model="senha"
                  :type="mostrarSenha ? 'text' : 'password'"
                  autocomplete="new-password"
                  aria-describedby="dica-senha"
                  placeholder="Crie uma senha"
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

              <p
                id="dica-senha"
                class="mt-2 text-xs text-gray-500"
              >
                Mínimo de {{ SENHA_MINIMA }} caracteres.
              </p>

            </div>

            <!-- Confirmar senha (o botão de mostrar vale para as duas) -->

            <div>

              <label
                for="confirmar-senha"
                class="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#292A2F]"
              >
                Confirmar senha
              </label>

              <input
                id="confirmar-senha"
                v-model="confirmarSenha"
                :type="mostrarSenha ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Repita a senha"
                class="w-full rounded-md border border-gray-300 px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#006EB7] focus:ring-2 focus:ring-[#006EB7]/10"
              />

            </div>

            <!-- Mensagem de erro -->

            <div
              v-if="erro"
              role="alert"
              class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600"
            >
              {{ erro }}
            </div>

            <!-- Botão -->

            <button
              type="submit"
              :disabled="enviando"
              class="w-full rounded-md bg-[#006EB7] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#03558c] disabled:cursor-wait disabled:opacity-70"
            >
              {{ enviando ? 'Criando conta...' : 'Criar conta' }}
            </button>

          </form>

        </template>

        <p
          v-if="!contaPendente"
          class="mt-6 text-center text-sm text-gray-500"
        >
          Já tem acesso?
          <RouterLink
            :to="{ path: '/login', query: route.query }"
            class="font-medium text-[#006EB7] hover:underline"
          >
            Fazer login
          </RouterLink>
        </p>

      </div>

    </div>

  </main>

</template>
