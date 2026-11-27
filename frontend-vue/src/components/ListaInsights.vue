<script setup>
// Insights do Dashboard em lista: tema com ícone, número principal em
// destaque e a frase completa. Uma linha por insight, sem buracos na grade;
// no celular o número fica ao lado do tema e a frase embaixo.
import { computed } from 'vue'
import { destacarInsight, ICONES } from '../utils/destaqueInsight'

const props = defineProps({
  // [{ titulo?, descricao }]
  insights: { type: Array, required: true }
})

const itens = computed(() => props.insights.map(destacarInsight))
</script>

<template>
  <ul class="divide-y divide-gray-100 rounded-lg border border-gray-100">
    <li
      v-for="item in itens"
      :key="item.descricao"
      class="grid grid-cols-[2.5rem_1fr_auto] items-start gap-x-3 gap-y-1 px-4 py-4 @2xl:grid-cols-[2.5rem_10rem_9rem_1fr] @2xl:items-center"
    >
      <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-cti-laranja-texto" aria-hidden="true">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" :d="ICONES[item.icone]" />
        </svg>
      </span>

      <p class="self-center text-xs font-bold uppercase tracking-wide text-cti-azul">
        {{ item.tema }}
      </p>

      <p v-if="item.numero" class="self-center text-right @2xl:text-left">
        <span class="block font-['Space_Grotesk'] text-xl font-bold leading-tight text-cti-grafite">{{ item.numero }}</span>
        <span class="block text-[11px] text-gray-500">{{ item.unidade }}</span>
      </p>
      <span v-else aria-hidden="true"></span>

      <p class="col-span-3 text-sm leading-relaxed text-gray-600 @2xl:col-span-1">
        {{ item.descricao }}
      </p>
    </li>
  </ul>
</template>
