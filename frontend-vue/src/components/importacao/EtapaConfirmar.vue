<script setup>
import { computed } from 'vue'
import { useUploadStore } from '../../stores/uploadStore'
import { contar, formatarNumero } from '../../utils/datas'

// Etapa 3: mostrar o impacto na base. Quem salva é a tela (evento
// "confirmar"): confirmarImportacao() limpa a análise, e isso tira este
// componente da tela antes de ele conseguir avisar que terminou.
const emit = defineEmits(['voltar', 'confirmar'])
const upload = useUploadStore()

const analise = computed(() => upload.analise)
const ignoradas = computed(() => analise.value.linhasComErro.length)

const impacto = computed(() => [
  { rotulo: 'Novos clientes', valor: `+${formatarNumero(analise.value.clientesNovos)}`, classe: 'text-green-700' },
  { rotulo: 'Já estavam na carteira', valor: formatarNumero(analise.value.clientesAtualizados), classe: 'text-[#292A2F]' },
  { rotulo: 'Saem da carteira', valor: formatarNumero(analise.value.foraDaPlanilha.length), classe: analise.value.foraDaPlanilha.length ? 'text-[#A85700]' : 'text-[#292A2F]' }
])

const MAX_NOMES = 10

const listarNomes = nomes => {
  const restantes = nomes.length - MAX_NOMES
  return nomes.slice(0, MAX_NOMES).join(', ') + (restantes > 0 ? ` e mais ${restantes}` : '')
}

const nomesForaDaPlanilha = computed(() => listarNomes(analise.value.foraDaPlanilha.map(cliente => cliente.nome_cliente)))
</script>

<template>
  <section
    aria-labelledby="confirmar-titulo"
    class="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
  >
    <header>
      <h2 id="confirmar-titulo" class="text-xl font-bold text-[#292A2F]">
        Confirme a importação
      </h2>
      <p class="mt-1 text-sm text-gray-500">
        <template v-if="analise.baseAnterior">
          Esta planilha substitui a carteira atual ({{ contar(analise.baseAnterior, 'cliente', 'clientes') }}).
        </template>
        <template v-else>
          Esta será a primeira carteira do sistema.
        </template>
      </p>
    </header>

    <dl class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div
        v-for="item in impacto"
        :key="item.rotulo"
        class="rounded-lg bg-gray-50 px-4 py-3"
      >
        <dt class="text-xs text-gray-500">{{ item.rotulo }}</dt>
        <dd class="mt-1 text-2xl font-bold" :class="item.classe">{{ item.valor }}</dd>
      </div>
    </dl>

    <!-- O aviso mais importante vem primeiro -->
    <div
      v-if="analise.foraDaPlanilha.length"
      role="alert"
      class="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <p class="font-semibold">
        {{ analise.foraDaPlanilha.length === 1 ? '1 cliente da carteira atual não está nesta planilha:' : `${formatarNumero(analise.foraDaPlanilha.length)} clientes da carteira atual não estão nesta planilha:` }}
      </p>
      <p class="mt-1">{{ nomesForaDaPlanilha }}.</p>
      <p class="mt-1">
        {{ analise.foraDaPlanilha.length === 1 ? 'Ele sai' : 'Eles saem' }} da carteira ao confirmar. Se a planilha está incompleta, volte e envie a carteira completa.
      </p>
    </div>

    <p
      v-if="analise.importacaoAnterior"
      class="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      Atenção: esta mesma planilha já foi importada antes. Confirme só se quiser reimportá-la.
    </p>

    <p
      v-if="ignoradas"
      class="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      {{ ignoradas === 1
        ? '1 linha com erro não será importada. Você pode corrigir e enviar de novo depois; ela também fica disponível para download no histórico.'
        : `${formatarNumero(ignoradas)} linhas com erro não serão importadas. Você pode corrigir e enviar de novo depois; elas também ficam disponíveis para download no histórico.` }}
    </p>

    <div
      v-if="upload.totalErros"
      role="alert"
      class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
    >
      <p v-for="erro in upload.erros" :key="erro">{{ erro }}</p>
    </div>

    <footer class="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-between">
      <button
        type="button"
        :disabled="upload.carregando"
        class="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:enabled:bg-gray-50 disabled:opacity-50"
        @click="emit('voltar')"
      >
        Voltar
      </button>

      <button
        type="button"
        :disabled="upload.carregando || !upload.podeConfirmar"
        class="inline-flex items-center justify-center gap-2 rounded-md bg-[#FF8F00] px-6 py-2.5 text-sm font-semibold text-[#292A2F] shadow-sm transition hover:enabled:bg-[#E68100] disabled:cursor-not-allowed disabled:opacity-50"
        @click="emit('confirmar')"
      >
        <svg v-if="upload.carregando" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.3" stroke-width="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
        </svg>
        {{ upload.carregando ? 'Importando...' : `${analise.importacaoAnterior ? 'Reimportar' : 'Importar'} ${contar(upload.totalClientes, 'cliente', 'clientes')}` }}
      </button>
    </footer>
  </section>
</template>
