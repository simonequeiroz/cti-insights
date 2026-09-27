<script setup>
// Etapas do envio. O status de cada etapa vem pronto da tela
// ('feito' | 'atual' | 'erro' | 'pendente'), derivado do estado real.
defineProps({
  etapas: { type: Array, required: true },
  carregando: { type: Boolean, default: false }
})

const classeMarcador = status => {
  if (status === 'feito') return 'border-green-600 bg-green-600 text-white'
  if (status === 'erro') return 'border-red-500 bg-red-500 text-white'
  if (status === 'atual') return 'border-[#006EB7] bg-white text-[#006EB7]'
  return 'border-gray-300 bg-white text-gray-400'
}

const textoStatus = {
  feito: 'concluída',
  atual: 'em andamento',
  erro: 'com erro',
  pendente: 'pendente'
}
</script>

<template>
  <ol
    class="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs"
    aria-label="Etapas da importação"
  >
    <li
      v-for="(etapa, indice) in etapas"
      :key="indice"
      class="flex items-center gap-2"
      :aria-current="etapa.status === 'atual' ? 'step' : undefined"
    >
      <span
        class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold"
        :class="classeMarcador(etapa.status)"
        aria-hidden="true"
      >
        <svg
          v-if="etapa.status === 'atual' && carregando"
          class="h-3 w-3 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
        </svg>
        <template v-else-if="etapa.status === 'feito'">✓</template>
        <template v-else-if="etapa.status === 'erro'">!</template>
        <template v-else>{{ indice + 1 }}</template>
      </span>

      <span :class="etapa.status === 'pendente' ? 'text-gray-400' : 'font-semibold text-[#292A2F]'">
        {{ etapa.titulo }}
        <span class="sr-only">({{ textoStatus[etapa.status] }})</span>
      </span>

      <span
        v-if="indice < etapas.length - 1"
        class="h-px w-6 bg-gray-300"
        aria-hidden="true"
      />
    </li>
  </ol>
</template>
