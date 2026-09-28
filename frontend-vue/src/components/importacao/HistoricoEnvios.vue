<script setup>
import { ref } from 'vue'
import { useUploadStore } from '../../stores/uploadStore'
import { formatarDataHora, formatarNumero } from '../../utils/datas'
import TabelaProblemas from '../TabelaProblemas.vue'

// Envios anteriores. Fica recolhido pra não competir com o assistente.
const upload = useUploadStore()
const aberto = ref(false)
const detalhesAbertos = ref(new Set())

const alternarDetalhes = id => {
  const abertos = new Set(detalhesAbertos.value)
  abertos.has(id) ? abertos.delete(id) : abertos.add(id)
  detalhesAbertos.value = abertos
}

const statusInfo = item => {
  if (item.status === 'PROCESSANDO') {
    return { texto: 'Processando...', classe: 'bg-orange-50 text-[#A85700]' }
  }

  if (item.status === 'NORMALIZADO') {
    return item.linhasIgnoradas
      ? { texto: `✓ Importado (${item.linhasIgnoradas} ignoradas)`, classe: 'bg-amber-50 text-amber-700' }
      : { texto: '✓ Importado', classe: 'bg-green-50 text-green-600' }
  }

  return { texto: '✗ Com erro', classe: 'bg-red-50 text-red-500' }
}
</script>

<template>
  <section
    aria-labelledby="historico-titulo"
    class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
  >
    <h2 id="historico-titulo">
      <button
        type="button"
        class="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-gray-50"
        :aria-expanded="aberto"
        aria-controls="historico-conteudo"
        @click="aberto = !aberto"
      >
        <span class="text-base font-bold text-[#292A2F]">Envios anteriores</span>
        <span class="text-xs text-gray-500">
          {{ upload.historico.length }} {{ upload.historico.length === 1 ? 'arquivo' : 'arquivos' }}
          <span aria-hidden="true">{{ aberto ? '▴' : '▾' }}</span>
        </span>
      </button>
    </h2>

    <div v-if="aberto" id="historico-conteudo" class="border-t border-gray-200">
      <p
        v-if="!upload.historico.length"
        class="px-6 py-8 text-center text-sm text-gray-500"
      >
        Nenhuma planilha enviada ainda.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-left text-xs">
          <caption class="sr-only">Planilhas enviadas, da mais recente para a mais antiga</caption>

          <thead class="bg-gray-50 text-gray-500">
            <tr>
              <th scope="col" class="px-6 py-3 font-semibold">Arquivo</th>
              <th scope="col" class="px-6 py-3 font-semibold">Enviado em</th>
              <th scope="col" class="px-6 py-3 font-semibold">Importados</th>
              <th scope="col" class="px-6 py-3 font-semibold">Situação</th>
              <th scope="col" class="px-6 py-3 font-semibold"><span class="sr-only">Ações</span></th>
            </tr>
          </thead>

          <tbody>
            <template v-for="item in upload.historico" :key="item.id">
              <tr class="border-t border-gray-100 transition-colors hover:bg-gray-50">
                <th scope="row" class="px-6 py-4 font-medium text-[#292A2F]">{{ item.nomeArquivo }}</th>

                <td class="px-6 py-4 text-gray-500">
                  <time :datetime="item.dataHora">{{ formatarDataHora(item.dataHora) }}</time>
                </td>

                <td class="px-6 py-4 text-gray-500">
                  {{ formatarNumero(item.linhasImportadas ?? (item.status === 'NORMALIZADO' ? item.linhasLidas : null)) }}
                </td>

                <td class="px-6 py-4">
                  <span class="rounded-full px-3 py-1 text-[11px] font-semibold" :class="statusInfo(item).classe">
                    {{ statusInfo(item).texto }}
                  </span>

                  <button
                    v-if="item.mensagem"
                    type="button"
                    class="mt-1.5 block text-[11px] font-semibold text-[#006EB7] hover:underline"
                    :aria-expanded="detalhesAbertos.has(item.id)"
                    @click="alternarDetalhes(item.id)"
                  >
                    {{ detalhesAbertos.has(item.id) ? 'ocultar detalhes ▴' : 'ver detalhes ▾' }}
                  </button>
                </td>

                <td class="px-6 py-4">
                  <div class="flex items-center justify-end gap-3">
                    <button
                      v-if="item.conteudoOriginal"
                      type="button"
                      class="text-gray-400 transition hover:text-[#006EB7]"
                      aria-label="Baixar linhas com erro"
                      title="Baixar linhas com erro"
                      @click="upload.baixarOriginal(item)"
                    >
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      class="text-gray-400 transition hover:text-red-500"
                      aria-label="Remover do histórico"
                      title="Remover do histórico"
                      @click="upload.removerDoHistorico(item.id)"
                    >
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="item.mensagem && detalhesAbertos.has(item.id)" class="bg-gray-50/60">
                <td colspan="5" class="px-6 pb-5 pt-1">
                  <TabelaProblemas
                    v-if="item.problemas?.length"
                    :problemas="item.problemas"
                    :total="item.totalProblemas"
                  />
                  <p v-else class="rounded-md border border-red-200 bg-white px-3 py-2 text-xs text-red-700">
                    {{ item.mensagem }}
                  </p>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
