<script setup>
// Indicador das 4 etapas do assistente de importação.
defineProps({
  etapaAtual: { type: Number, required: true }
})

const PASSOS = ['Enviar arquivo', 'Revisar dados', 'Confirmar', 'Concluído']
</script>

<template>
  <nav aria-label="Etapas da importação">
    <ol class="flex items-center gap-2 sm:gap-3">
      <li
        v-for="(titulo, indice) in PASSOS"
        :key="titulo"
        class="flex flex-1 items-center gap-2 last:flex-none sm:gap-3"
        :aria-current="indice + 1 === etapaAtual ? 'step' : undefined"
      >
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition"
          :class="indice + 1 < etapaAtual
            ? 'border-green-600 bg-green-600 text-white'
            : indice + 1 === etapaAtual
              ? 'border-[#006EB7] bg-[#006EB7] text-white'
              : 'border-gray-300 bg-white text-gray-400'"
          aria-hidden="true"
        >
          {{ indice + 1 < etapaAtual ? '✓' : indice + 1 }}
        </span>

        <span
          class="hidden text-sm sm:inline"
          :class="indice + 1 === etapaAtual ? 'font-semibold text-[#292A2F]' : indice + 1 < etapaAtual ? 'text-green-700' : 'text-gray-400'"
        >
          {{ titulo }}
        </span>
        <span class="sr-only sm:hidden">{{ titulo }}</span>

        <span
          v-if="indice < PASSOS.length - 1"
          class="h-px flex-1 transition"
          :class="indice + 1 < etapaAtual ? 'bg-green-600' : 'bg-gray-300'"
          aria-hidden="true"
        />
      </li>
    </ol>
  </nav>
</template>
