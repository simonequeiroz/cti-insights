<script setup>
import { computed, nextTick, ref } from 'vue'
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
// erro: mensagem geral (ex.: resposta do servidor). errosCampo: um texto
// por campo, mostrado embaixo dele
const erro = ref('')
const errosCampo = ref({})
const enviando = ref(false)

// Quem se cadastra escolhe entre Consultor e Gestor. Administrador é
// definido por outro administrador, na tela Usuários.
const PAPEIS_CADASTRO = PAPEIS.filter(item => item.valor !== 'ADMINISTRADOR')

// Mesma ideia da regra do Spring (algo@algo), exigindo também um ponto no
// domínio, para pegar erros comuns como "ana@" ou "ana@empresa"
const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Só caminhos internos (mesma regra do login)
const destinoSeguro = destino => (typeof destino === 'string' && destino.startsWith('/') && !destino.startsWith('//') && !destino.startsWith('/\\')
  ? destino
  : '/dashboard')

// Conta criada que ficou aguardando aprovação: troca o formulário pela
// mensagem de "cadastro enviado"
const contaPendente = ref(null)

const descricaoPapel = computed(() => PAPEIS_CADASTRO.find(item => item.valor === papel.value)?.descricao || '')

// Confere o formulário e devolve { campo: mensagem } (vazio = tudo certo)
const validar = () => {
  const erros = {}
  const nomeLimpo = nome.value.trim()

  if (!nomeLimpo) {
    erros.nome = 'Digite seu nome e sobrenome.'
  } else if (nomeLimpo.split(/\s+/).length < 2) {
    // Nome e sobrenome: é o que aparece no menu e no histórico de envios
    erros.nome = 'Digite também o sobrenome.'
  }

  if (!email.value.trim()) {
    erros.email = 'Digite seu e-mail.'
  } else if (!EMAIL_VALIDO.test(email.value.trim())) {
    erros.email = 'Digite um e-mail válido, como nome.sobrenome@empresa.com.'
  }

  if (!papel.value) {
    erros.papel = 'Escolha o seu papel.'
  }

  if (!senha.value) {
    erros.senha = 'Crie uma senha.'
  } else if (senha.value.length < SENHA_MINIMA) {
    erros.senha = `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`
  }

  if (!confirmarSenha.value) {
    erros['confirmar-senha'] = 'Repita a senha.'
  } else if (senha.value && senha.value !== confirmarSenha.value) {
    erros['confirmar-senha'] = 'As senhas não conferem.'
  }

  return erros
}

const classeCampo = campo => errosCampo.value[campo]
  ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
  : 'border-gray-300 focus:border-[#006EB7] focus:ring-[#006EB7]/10'

const criarConta = async () => {
  erro.value = ''
  errosCampo.value = validar()

  // Leva o cursor ao primeiro campo com problema
  const primeiro = ['nome', 'email', 'papel', 'senha', 'confirmar-senha'].find(campo => errosCampo.value[campo])
  if (primeiro) {
    await nextTick()
    document.getElementById(primeiro)?.focus()
    return
  }

  if (enviando.value) {
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
      : falha.message || 'Não foi possível criar a conta. Tente novamente.'
    return
  } finally {
    enviando.value = false
  }

  if (conta.status === STATUS_CONTA.PENDENTE) {
    contaPendente.value = conta
    return
  }

  router.push(destinoSeguro(route.query.redirect))
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
            de um administrador.
          </p>

          <p class="mt-3 text-sm leading-relaxed text-gray-600">
            <strong>Avise o administrador da sua equipe</strong> para agilizar. O sistema não envia
            e-mail: depois da aprovação, é só entrar com o seu e-mail e a sua senha.
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
                :aria-invalid="Boolean(errosCampo['nome'])"
                :aria-describedby="errosCampo['nome'] ? 'erro-nome' : undefined"
                class="w-full rounded-md border px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:ring-2"
                :class="classeCampo('nome')"
              />
              <p v-if="errosCampo['nome']" id="erro-nome" class="mt-1 text-xs font-medium text-red-600">{{ errosCampo['nome'] }}</p>

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
                :aria-invalid="Boolean(errosCampo['email'])"
                :aria-describedby="errosCampo['email'] ? 'erro-email' : undefined"
                class="w-full rounded-md border px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:ring-2"
                :class="classeCampo('email')"
              />
              <p v-if="errosCampo['email']" id="erro-email" class="mt-1 text-xs font-medium text-red-600">{{ errosCampo['email'] }}</p>

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
                :aria-describedby="errosCampo.papel ? 'erro-papel dica-papel' : 'dica-papel'"
                :aria-invalid="Boolean(errosCampo.papel)"
                class="w-full rounded-md border bg-white px-4 py-3 text-sm outline-none transition focus:ring-2"
                :class="[papel ? 'text-gray-700' : 'text-gray-400', classeCampo('papel')]"
              >
                <option value="" disabled>Selecione seu papel</option>
                <option
                  v-for="item in PAPEIS_CADASTRO"
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
                O administrador confirma o seu papel ao aprovar o cadastro.
              </p>
              <p v-if="errosCampo.papel" id="erro-papel" class="mt-1 text-xs font-medium text-red-600">{{ errosCampo.papel }}</p>

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
                  :aria-describedby="errosCampo.senha ? 'erro-senha dica-senha' : 'dica-senha'"
                  :aria-invalid="Boolean(errosCampo.senha)"
                  placeholder="Crie uma senha"
                  class="w-full rounded-md border px-4 py-3 pr-11 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:ring-2"
                  :class="classeCampo('senha')"
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
              <p v-if="errosCampo.senha" id="erro-senha" class="mt-1 text-xs font-medium text-red-600">{{ errosCampo.senha }}</p>

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
                :aria-invalid="Boolean(errosCampo['confirmar-senha'])"
                :aria-describedby="errosCampo['confirmar-senha'] ? 'erro-confirmar-senha' : undefined"
                class="w-full rounded-md border px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:ring-2"
                :class="classeCampo('confirmar-senha')"
              />
              <p v-if="errosCampo['confirmar-senha']" id="erro-confirmar-senha" class="mt-1 text-xs font-medium text-red-600">{{ errosCampo['confirmar-senha'] }}</p>

            </div>

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
