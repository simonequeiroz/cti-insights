<script setup>
import { computed, ref } from 'vue'
import { formatarTamanho, TAMANHO_MAXIMO_MB, useUploadStore } from '../../stores/uploadStore'
import { baixarModelo } from '../../utils/modeloPlanilha'

// Etapa 1: escolher o arquivo e pedir a análise. Nada é salvo aqui.
const emit = defineEmits(['analisado'])
const upload = useUploadStore()

const fileInput = ref(null)
const mostrarColunas = ref(false)

const podeAnalisar = computed(() => Boolean(upload.arquivo) && !upload.erros.length && !upload.carregando)

const abrirSeletor = () => {
  if (!upload.carregando) fileInput.value.click()
}

const aoSelecionarArquivo = event => {
  const file = event.target.files[0]
  if (file) upload.selecionarArquivo(file)
  // Permite escolher de novo o mesmo arquivo depois de corrigir
  event.target.value = ''
}

const analisar = async () => {
  if (!podeAnalisar.value) return
  const analise = await upload.analisarPlanilha()
  if (analise) emit('analisado')
}

// Arrastar e soltar (contador evita o "pisca" ao passar sobre os filhos)
const arrastando = ref(false)
let contadorArraste = 0

const aoEntrar = () => {
  contadorArraste++
  arrastando.value = true
}

const aoSair = () => {
  contadorArraste = Math.max(0, contadorArraste - 1)
  if (contadorArraste === 0) arrastando.value = false
}

const aoSoltar = event => {
  contadorArraste = 0
  arrastando.value = false
  if (upload.carregando) return
  const file = event.dataTransfer?.files?.[0]
  if (file) upload.selecionarArquivo(file)
}
</script>

<template>
  <section
    aria-labelledby="enviar-titulo"
    class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
  >
    <header class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 id="enviar-titulo" class="text-xl font-bold text-[#292A2F]">
          Envie a planilha de clientes
        </h2>
        <p class="mt-1 text-sm text-gray-500">
          Nada é salvo nesta etapa. Antes de importar, você revisa tudo.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex shrink-0 items-center gap-2 rounded-md border border-[#006EB7] px-4 py-2 text-xs font-semibold text-[#006EB7] transition hover:bg-blue-50"
        @click="baixarModelo"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Baixar modelo
      </button>
    </header>

    <div
      role="region"
      aria-label="Área para arrastar e soltar a planilha"
      class="flex min-h-[240px] flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition"
      :class="arrastando ? 'border-[#006EB7] bg-blue-50/60' : 'border-gray-300 hover:border-[#006EB7] hover:bg-blue-50/30'"
      @dragenter.prevent="aoEntrar"
      @dragover.prevent
      @dragleave.prevent="aoSair"
      @drop.prevent="aoSoltar"
    >
      <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#006EB7]">
        <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M5 20h14" />
        </svg>
      </div>

      <p class="text-lg font-bold text-[#292A2F]">
        {{ arrastando ? 'Solte o arquivo aqui' : 'Arraste a planilha para cá' }}
      </p>
      <p class="mt-1 text-sm text-gray-500">
        .xlsx, .xls ou .csv de até {{ TAMANHO_MAXIMO_MB }} MB
      </p>

      <button
        type="button"
        :disabled="upload.carregando"
        class="mt-5 rounded-md bg-[#FF8F00] px-6 py-3 text-xs font-semibold text-white shadow-sm transition hover:enabled:bg-[#E68100] disabled:cursor-not-allowed disabled:opacity-50"
        @click="abrirSeletor"
      >
        {{ upload.arquivo ? 'Trocar arquivo' : 'Selecionar arquivo' }}
      </button>

      <input
        ref="fileInput"
        type="file"
        accept=".xlsx,.xls,.csv"
        class="hidden"
        tabindex="-1"
        aria-hidden="true"
        @change="aoSelecionarArquivo"
      />
    </div>

    <!-- Arquivo escolhido -->
    <div
      v-if="upload.arquivo"
      class="mt-5 flex flex-col gap-3 rounded-md border border-gray-200 px-4 py-3 sm:flex-row sm:items-center"
    >
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-[#292A2F]">{{ upload.arquivo.name }}</p>
        <p class="text-[11px] text-gray-500">{{ formatarTamanho(upload.arquivo.size) }}</p>
      </div>

      <button
        v-if="!upload.carregando"
        type="button"
        class="text-xs font-semibold text-gray-500 transition hover:text-red-500"
        @click="upload.descartarArquivo()"
      >
        Remover
      </button>

      <button
        type="button"
        :disabled="!podeAnalisar"
        class="inline-flex items-center justify-center gap-2 rounded-md bg-[#006EB7] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:enabled:bg-[#03558c] disabled:cursor-not-allowed disabled:opacity-50"
        @click="analisar"
      >
        <svg v-if="upload.carregando" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.3" stroke-width="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
        </svg>
        {{ upload.carregando ? 'Analisando...' : 'Analisar planilha' }}
      </button>
    </div>

    <!-- Erros: formato, tamanho, arquivo ilegível ou vazio -->
    <div
      v-if="upload.erros.length"
      role="alert"
      class="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
    >
      <p v-for="erro in upload.erros" :key="erro">{{ erro }}</p>
    </div>

    <!-- Colunas esperadas -->
    <div class="mt-5 border-t border-gray-100 pt-4">
      <button
        type="button"
        class="text-xs font-semibold text-[#006EB7] hover:underline"
        :aria-expanded="mostrarColunas"
        aria-controls="colunas-esperadas"
        @click="mostrarColunas = !mostrarColunas"
      >
        {{ mostrarColunas ? 'Ocultar colunas ▴' : 'Quais colunas a planilha precisa ter? ▾' }}
      </button>

      <dl
        v-if="mostrarColunas"
        id="colunas-esperadas"
        class="mt-3 space-y-1 rounded-md bg-gray-50 p-3 text-xs text-gray-600"
      >
        <dt class="font-semibold text-gray-700">Obrigatórias</dt>
        <dd class="font-['IBM_Plex_Mono']">consultor, codigo_cliente, nome_cliente, segmento, nivel_cliente (A, B ou C), data_contratacao, servicos_contratados</dd>
        <dt class="pt-1 font-semibold text-gray-700">Opcional</dt>
        <dd class="font-['IBM_Plex_Mono']">faturamento_anual</dd>
      </dl>
    </div>
  </section>
</template>
