<script setup>
import { onBeforeUnmount, watch } from 'vue'

// Aviso flutuante no canto da tela (retorno de sucesso/erro de uma ação).
// Some sozinho depois de alguns segundos; quem usa só controla "mensagem":
// preenchida mostra, vazia esconde.
const props = defineProps({
  mensagem: { type: String, default: '' },
  tipo: { type: String, default: 'sucesso' }, // 'sucesso' | 'erro'
  duracao: { type: Number, default: 6000 }
})

const emit = defineEmits(['fechar'])

let temporizador = null

watch(
  () => props.mensagem,
  mensagem => {
    clearTimeout(temporizador)

    if (mensagem) {
      temporizador = setTimeout(() => emit('fechar'), props.duracao)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => clearTimeout(temporizador))
</script>

<template>
  <Transition
    enter-from-class="translate-y-2 opacity-0"
    enter-active-class="transition duration-200"
    leave-to-class="opacity-0"
    leave-active-class="transition duration-200"
  >
    <div
      v-if="mensagem"
      :role="tipo === 'erro' ? 'alert' : 'status'"
      class="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg"
      :class="tipo === 'erro' ? 'border-red-200' : 'border-green-200'"
    >
      <span
        class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        :class="tipo === 'erro' ? 'bg-red-500' : 'bg-green-600'"
        aria-hidden="true"
      >
        {{ tipo === 'erro' ? '!' : '✓' }}
      </span>

      <p class="flex-1 text-[#292A2F]">
        {{ mensagem }}
      </p>

      <button
        type="button"
        class="text-gray-400 transition hover:text-gray-600"
        aria-label="Fechar aviso"
        @click="emit('fechar')"
      >
        ✕
      </button>
    </div>
  </Transition>
</template>
