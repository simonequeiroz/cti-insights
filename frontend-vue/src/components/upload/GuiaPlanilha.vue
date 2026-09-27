<script setup>
import { ref } from 'vue'
import { baixarModelo } from '../../utils/modeloPlanilha'

defineProps({
  tamanhoMaximoMb: { type: Number, required: true }
})

const mostrarColunas = ref(false)
</script>

<template>
  <section
    aria-labelledby="guia-titulo"
    class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
  >
    <h2
      id="guia-titulo"
      class="text-sm font-bold text-[#292A2F]"
    >
      Primeira vez por aqui?
    </h2>

    <ol class="mt-3 space-y-1.5 text-sm text-gray-600">
      <li><span class="font-semibold text-[#006EB7]">1.</span> Baixe o modelo de planilha</li>
      <li><span class="font-semibold text-[#006EB7]">2.</span> Preencha a aba "Clientes"</li>
      <li><span class="font-semibold text-[#006EB7]">3.</span> Envie o arquivo aqui</li>
    </ol>

    <button
      type="button"
      class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#006EB7] bg-white px-4 py-2.5 text-xs font-semibold text-[#006EB7] transition hover:bg-blue-50"
      @click="baixarModelo"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      Baixar modelo
    </button>

    <p class="mt-4 text-xs text-gray-500">
      Aceita .xlsx, .xls ou .csv de até {{ tamanhoMaximoMb }} MB.
    </p>

    <button
      type="button"
      class="mt-1 text-xs font-semibold text-[#006EB7] hover:underline"
      :aria-expanded="mostrarColunas"
      aria-controls="guia-colunas"
      @click="mostrarColunas = !mostrarColunas"
    >
      {{ mostrarColunas ? 'Ocultar colunas ▴' : 'Ver colunas obrigatórias ▾' }}
    </button>

    <dl
      v-if="mostrarColunas"
      id="guia-colunas"
      class="mt-3 space-y-1 rounded-md bg-gray-50 p-3 text-[11px] text-gray-600"
    >
      <dt class="font-semibold text-gray-700">Obrigatórias</dt>
      <dd class="font-['IBM_Plex_Mono']">consultor, codigo_cliente, nome_cliente, segmento, nivel_cliente (A, B ou C), data_contratacao, servicos_contratados</dd>
      <dt class="pt-1 font-semibold text-gray-700">Opcional</dt>
      <dd class="font-['IBM_Plex_Mono']">faturamento_anual</dd>
    </dl>
  </section>
</template>
