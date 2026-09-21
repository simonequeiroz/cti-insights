<script setup>
import { ref } from 'vue'

const email = ref('')
const senha = ref('')
const erro = ref('')

const entrar = () => {
  erro.value = ''

  if (!email.value || !senha.value) {
    erro.value = 'Preencha o e-mail e a senha.'
    return
  }

  if (!email.value.includes('@')) {
    erro.value = 'Digite um e-mail válido.'
    return
  }

  window.location.href = '/dashboard'
}
</script>

<template>

  <div
    class="grid-background min-h-screen flex items-center justify-center px-6 py-10"
  >

    <div
      class="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-lg p-8 sm:p-10"
    >

      <!-- Logo -->

      <div class="text-center mb-8">

        <RouterLink
          to="/"
          class="text-2xl font-bold tracking-tight text-[#2874BE]"
        >
          CTI Insights<span class="text-[#F7941D]">.</span>
        </RouterLink>

        <p class="mt-2 text-xs text-gray-400">
          Acesse sua plataforma de dados
        </p>

      </div>

      <!-- Título -->

      <div class="mb-6">

        <h1 class="text-2xl font-bold text-[#292A2F]">
          Bem-vindo de volta
        </h1>

        <p class="mt-2 text-sm text-gray-500">
          Entre com seus dados para acessar o sistema.
        </p>

      </div>

      <!-- Formulário -->

      <form
        @submit.prevent="entrar"
        class="space-y-5"
      >

        <!-- E-mail -->

        <div>

          <label
            for="email"
            class="mb-2 block text-xs font-semibold text-[#292A2F]"
          >
            E-mail
          </label>

          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="seu@email.com"
            class="w-full rounded-md border border-gray-300 px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#2874BE] focus:ring-2 focus:ring-[#2874BE]/10"
          />

        </div>

        <!-- Senha -->

        <div>

          <div class="mb-2 flex items-center justify-between">

            <label
              for="password"
              class="block text-xs font-semibold text-[#292A2F]"
            >
              Senha
            </label>

            <button
              type="button"
              class="text-[11px] font-medium text-[#2874BE] hover:underline"
            >
              Esqueceu a senha?
            </button>

          </div>

          <input
            id="password"
            v-model="senha"
            type="password"
            placeholder="Digite sua senha"
            class="w-full rounded-md border border-gray-300 px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#2874BE] focus:ring-2 focus:ring-[#2874BE]/10"
          />

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
          class="w-full rounded-md bg-[#2874BE] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2165A5]"
        >
          Entrar
        </button>

      </form>

      <!-- Voltar -->

      <div class="mt-8 text-center">

        <RouterLink
          to="/"
          class="text-xs text-gray-500 transition hover:text-[#2874BE]"
        >
          ← Voltar para apresentação
        </RouterLink>

      </div>

    </div>

  </div>

</template>