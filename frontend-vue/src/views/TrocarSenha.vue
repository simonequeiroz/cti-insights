<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
import { useAuthStore } from '../stores/authStore'

// Troca da própria senha. Dois casos:
// - obrigatório: entrou com a senha temporária gerada pelo administrador
//   (auth.precisaTrocarSenha); a guarda de rota só libera o sistema depois;
// - voluntário: pelo link "Trocar senha" do menu.
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const obrigatorio = computed(() => auth.precisaTrocarSenha)

const senhaAtual = ref('')
const novaSenha = ref('')
const confirmacao = ref('')
const mostrar = ref(false)
const erro = ref('')
const salvando = ref(false)
const concluido = ref(false)

// Só caminhos internos (mesma regra do login)
const destinoSeguro = destino => (typeof destino === 'string' && destino.startsWith('/') && !destino.startsWith('//') && !destino.startsWith('/\\')
  ? destino
  : '/dashboard')

const salvar = async () => {
  erro.value = ''

  if (!senhaAtual.value || !novaSenha.value || !confirmacao.value) {
    erro.value = 'Preencha os três campos.'
    return
  }
  if (novaSenha.value.length < 8) {
    erro.value = 'A senha nova deve ter ao menos 8 caracteres.'
    return
  }
  if (novaSenha.value !== confirmacao.value) {
    erro.value = 'A confirmação não é igual à senha nova.'
    return
  }
  if (novaSenha.value === senhaAtual.value) {
    erro.value = 'A senha nova deve ser diferente da atual.'
    return
  }

  salvando.value = true
  try {
    const eraObrigatorio = obrigatorio.value
    await auth.trocarSenha(senhaAtual.value, novaSenha.value)
    senhaAtual.value = ''
    novaSenha.value = ''
    confirmacao.value = ''

    if (eraObrigatorio) {
      router.push(destinoSeguro(route.query.redirect))
    } else {
      concluido.value = true
    }
  } catch (falha) {
    erro.value = falha.message || 'Não foi possível trocar a senha. Tente novamente.'
  } finally {
    salvando.value = false
  }
}

const sair = async () => {
  await auth.sair()
  router.push('/login')
}

const classeCampo = 'w-full rounded-md border border-gray-300 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-cti-azul focus:ring-2 focus:ring-cti-azul/10'
</script>

<template>
  <div class="flex min-h-screen flex-col sm:flex-row">

    <!-- No caso obrigatório não há menu: o sistema só abre depois da troca -->
    <Sidebar v-if="!obrigatorio" />

    <div class="grid-background flex min-w-0 flex-1 items-start justify-center px-4 py-10 sm:items-center">

      <section
        aria-labelledby="trocar-senha-titulo"
        class="w-full max-w-md rounded-xl border-t-4 border-cti-laranja bg-white p-6 shadow-lg ring-1 ring-gray-200 sm:p-8"
      >
        <h1 id="trocar-senha-titulo" class="text-2xl font-bold text-cti-grafite">
          {{ obrigatorio ? 'Crie uma senha nova' : 'Trocar senha' }}
        </h1>

        <p class="mt-2 text-sm text-gray-500">
          <template v-if="obrigatorio">
            Você entrou com uma senha temporária. Para continuar, crie uma senha só sua.
          </template>
          <template v-else>
            Confirme a senha atual e escolha uma nova.
          </template>
        </p>

        <p
          v-if="concluido"
          role="status"
          class="mt-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          Senha trocada. Use a senha nova no próximo acesso.
        </p>

        <form class="mt-6 space-y-4" novalidate @submit.prevent="salvar">
          <label class="block text-xs font-semibold uppercase tracking-wide text-cti-grafite">
            {{ obrigatorio ? 'Senha temporária' : 'Senha atual' }}
            <input
              v-model="senhaAtual"
              :type="mostrar ? 'text' : 'password'"
              autocomplete="current-password"
              :class="[classeCampo, 'mt-2 font-normal normal-case tracking-normal']"
            />
          </label>

          <label class="block text-xs font-semibold uppercase tracking-wide text-cti-grafite">
            Senha nova
            <input
              v-model="novaSenha"
              :type="mostrar ? 'text' : 'password'"
              autocomplete="new-password"
              :class="[classeCampo, 'mt-2 font-normal normal-case tracking-normal']"
            />
            <span class="mt-1 block text-xs font-normal normal-case tracking-normal text-gray-500">Mínimo de 8 caracteres.</span>
          </label>

          <label class="block text-xs font-semibold uppercase tracking-wide text-cti-grafite">
            Confirme a senha nova
            <input
              v-model="confirmacao"
              :type="mostrar ? 'text' : 'password'"
              autocomplete="new-password"
              :class="[classeCampo, 'mt-2 font-normal normal-case tracking-normal']"
            />
          </label>

          <label class="flex items-center gap-2 text-sm text-gray-600">
            <input v-model="mostrar" type="checkbox" class="h-4 w-4 rounded border-gray-300" />
            Mostrar senhas
          </label>

          <div
            v-if="erro"
            role="alert"
            class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {{ erro }}
          </div>

          <button
            type="submit"
            :disabled="salvando"
            class="w-full rounded-md bg-cti-azul px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cti-azul-escuro disabled:opacity-70"
          >
            {{ salvando ? 'Salvando...' : (obrigatorio ? 'Salvar e entrar' : 'Trocar senha') }}
          </button>
        </form>

        <p v-if="obrigatorio" class="mt-6 text-center text-sm text-gray-500">
          Não é você?
          <button type="button" class="font-medium text-cti-azul hover:underline" @click="sair">Sair</button>
        </p>
      </section>

    </div>
  </div>
</template>
