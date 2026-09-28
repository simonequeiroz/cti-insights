<script setup>
import { computed } from 'vue'
import { PERMITIR_IMPORTACAO_PARCIAL, formatarTamanho, useUploadStore } from '../../stores/uploadStore'
import { resumirCorrecoes } from '../../utils/correcoes'
import { formatarNumero } from '../../utils/datas'
import TabelaProblemas from '../TabelaProblemas.vue'
import PreviaClientes from '../PreviaClientes.vue'

// Etapa 2: mostrar o que a análise encontrou. Nada foi salvo ainda.
const emit = defineEmits(['voltar', 'continuar'])
const upload = useUploadStore()

const analise = computed(() => upload.analise)
const correcoes = computed(() => resumirCorrecoes(analise.value.validos))
const totalComErro = computed(() => analise.value.linhasComErro.length)

const MAX_CORRECOES = 6

const indicadores = computed(() => [
  { rotulo: 'Linhas lidas', valor: formatarNumero(analise.value.linhasLidas), classe: 'bg-gray-50 text-[#292A2F]' },
  { rotulo: 'Prontas para importar', valor: formatarNumero(analise.value.validos.length), classe: 'bg-green-50 text-green-700' },
  { rotulo: 'Corrigidas automaticamente', valor: formatarNumero(correcoes.value.clientesCorrigidos), classe: 'bg-blue-50 text-[#006EB7]' },
  { rotulo: 'Com erro', valor: formatarNumero(totalComErro.value), classe: totalComErro.value ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500' }
])

const trocarArquivo = () => {
  upload.cancelarAnalise()
  emit('voltar')
}
</script>

<template>
  <section
    aria-labelledby="revisar-titulo"
    class="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
  >
    <header class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 id="revisar-titulo" class="text-xl font-bold text-[#292A2F]">
          Revise antes de importar
        </h2>
        <p class="mt-1 text-sm text-gray-500">
          Os dados abaixo já estão padronizados. Nada foi salvo ainda.
        </p>
      </div>
      <p class="text-xs text-gray-500">
        {{ analise.nomeArquivo }} · {{ formatarTamanho(analise.tamanho) }}
      </p>
    </header>

    <!-- Números da análise -->
    <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div
        v-for="item in indicadores"
        :key="item.rotulo"
        class="rounded-lg px-4 py-3"
        :class="item.classe"
      >
        <dt class="text-xs">{{ item.rotulo }}</dt>
        <dd class="mt-1 text-2xl font-bold">{{ item.valor }}</dd>
      </div>
    </dl>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- O que foi corrigido -->
      <div>
        <h3 class="text-sm font-bold text-[#292A2F]">Corrigido automaticamente</h3>

        <p v-if="!correcoes.lista.length" class="mt-2 text-sm text-gray-500">
          Nenhuma correção necessária: a planilha já veio padronizada.
        </p>

        <ul v-else class="mt-2 divide-y divide-gray-100 rounded-md border border-gray-100 text-sm">
          <li
            v-for="correcao in correcoes.lista.slice(0, MAX_CORRECOES)"
            :key="correcao.chave"
            class="flex items-center justify-between gap-3 px-3 py-2"
          >
            <span class="min-w-0 truncate">
              <span class="text-xs text-gray-400">{{ correcao.campo }}: </span>
              <span class="font-['IBM_Plex_Mono'] text-xs text-red-500 line-through">{{ correcao.de || '(vazio)' }}</span>
              <span aria-hidden="true"> → </span>
              <span class="sr-only"> corrigido para </span>
              <span class="font-semibold text-[#292A2F]">{{ correcao.para }}</span>
            </span>
            <span class="shrink-0 text-xs text-gray-500">{{ correcao.quantidade }}×</span>
          </li>
        </ul>

        <p v-if="correcoes.lista.length > MAX_CORRECOES" class="mt-2 text-xs text-gray-500">
          + {{ correcoes.lista.length - MAX_CORRECOES }} outra(s) correção(ões).
        </p>
      </div>

      <!-- O que precisa de ajuste -->
      <div>
        <h3 class="text-sm font-bold text-[#292A2F]">Precisa de ajuste</h3>

        <p v-if="!totalComErro" class="mt-2 text-sm text-green-700">
          ✓ Nenhuma linha com erro.
        </p>

        <template v-else>
          <div class="mt-2">
            <TabelaProblemas :problemas="analise.problemas" :total="analise.totalProblemas" />
          </div>

          <button
            type="button"
            class="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#006EB7] hover:underline"
            @click="upload.baixarLinhasComErro()"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Baixar só as {{ totalComErro }} linha(s) com erro
          </button>
        </template>
      </div>
    </div>

    <!-- Prévia do que vai entrar -->
    <div v-if="analise.validos.length">
      <h3 class="mb-3 text-sm font-bold text-[#292A2F]">Prévia do que será importado</h3>
      <PreviaClientes :clientes="analise.validos" />
    </div>

    <!-- Avisos que impedem continuar -->
    <p
      v-if="!analise.validos.length"
      role="alert"
      class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      Nenhuma linha pode ser importada. Corrija a planilha e envie de novo.
    </p>
    <p
      v-else-if="totalComErro && !PERMITIR_IMPORTACAO_PARCIAL"
      role="alert"
      class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      A planilha só pode ser importada sem erros. Corrija as {{ totalComErro }} linha(s) e envie de novo.
    </p>

    <footer class="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-between">
      <button
        type="button"
        class="rounded-md border border-gray-300 px-5 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
        @click="trocarArquivo"
      >
        Trocar arquivo
      </button>

      <button
        type="button"
        :disabled="!upload.podeConfirmar"
        class="rounded-md bg-[#006EB7] px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:enabled:bg-[#03558c] disabled:cursor-not-allowed disabled:opacity-50"
        @click="emit('continuar')"
      >
        Continuar
      </button>
    </footer>
  </section>
</template>
