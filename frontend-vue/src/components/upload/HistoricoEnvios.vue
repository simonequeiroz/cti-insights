<script setup>
import { ref } from 'vue'
import { useUploadStore } from '../../stores/uploadStore'
import { formatarDataHora } from '../../utils/datas'
import TabelaProblemas from '../TabelaProblemas.vue'

const upload = useUploadStore()

// Linhas com o detalhe do erro aberto
const detalhesAbertos = ref(new Set())

const alternarDetalhes = id => {
  const abertos = new Set(detalhesAbertos.value)
  abertos.has(id) ? abertos.delete(id) : abertos.add(id)
  detalhesAbertos.value = abertos
}

// Os códigos internos (NORMALIZADO, ERRO_SCHEMA) continuam no store;
// aqui só muda o texto que o consultor lê.
const statusInfo = status => {
  if (status === 'PROCESSANDO') {
    return { texto: 'Processando...', classe: 'bg-orange-50 text-[#A85700]' }
  }

  if (status === 'NORMALIZADO') {
    return { texto: '✓ Importado', classe: 'bg-green-50 text-green-600' }
  }

  return { texto: '✗ Com erro', classe: 'bg-red-50 text-red-500' }
}
</script>

<template>
  <section
    aria-labelledby="historico-titulo"
    class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
  >
    <header class="flex items-center justify-between border-b border-gray-200 px-6 py-5">
      <h2
        id="historico-titulo"
        class="text-lg font-bold text-[#292A2F]"
      >
        Histórico de envios
      </h2>

      <span
        v-if="upload.historico.length"
        class="text-xs text-gray-500"
      >
        {{ upload.historico.length }} {{ upload.historico.length === 1 ? 'arquivo' : 'arquivos' }}
      </span>
    </header>

    <p
      v-if="!upload.historico.length"
      class="px-6 py-8 text-center text-sm text-gray-500"
    >
      Nenhuma planilha enviada ainda. Os envios aparecem aqui.
    </p>

    <div
      v-else
      class="overflow-x-auto"
    >
      <table class="w-full min-w-[640px] text-left text-xs">
        <caption class="sr-only">Planilhas enviadas, da mais recente para a mais antiga</caption>

        <thead class="bg-gray-50 text-gray-500">
          <tr>
            <th scope="col" class="px-6 py-3 font-semibold">Arquivo</th>
            <th scope="col" class="px-6 py-3 font-semibold">Enviado em</th>
            <th scope="col" class="px-6 py-3 font-semibold">Linhas</th>
            <th scope="col" class="px-6 py-3 font-semibold">Situação</th>
            <th scope="col" class="px-6 py-3 font-semibold"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>

        <tbody>
          <template
            v-for="item in upload.historico"
            :key="item.id"
          >
            <tr class="border-t border-gray-100 transition-colors hover:bg-gray-50">
              <th scope="row" class="px-6 py-4 font-medium text-[#292A2F]">
                {{ item.nomeArquivo }}
              </th>

              <td class="px-6 py-4 text-gray-500">
                <time :datetime="item.dataHora">{{ formatarDataHora(item.dataHora) }}</time>
              </td>

              <td class="px-6 py-4 text-gray-500">
                {{ item.linhasLidas ?? '--' }}
              </td>

              <td class="px-6 py-4">
                <span
                  class="rounded-full px-3 py-1 text-[11px] font-semibold"
                  :class="statusInfo(item.status).classe"
                >
                  {{ statusInfo(item.status).texto }}
                </span>

                <button
                  v-if="item.mensagem"
                  type="button"
                  class="mt-1.5 block text-[11px] font-semibold text-[#006EB7] hover:underline"
                  :aria-expanded="detalhesAbertos.has(item.id)"
                  @click="alternarDetalhes(item.id)"
                >
                  {{ detalhesAbertos.has(item.id) ? 'ocultar o que deu errado ▴' : 'ver o que deu errado ▾' }}
                </button>
              </td>

              <td class="px-6 py-4">
                <div class="flex items-center justify-end gap-3">
                  <button
                    v-if="item.status === 'ERRO_SCHEMA' && item.conteudoOriginal"
                    type="button"
                    class="text-gray-400 transition hover:text-[#006EB7]"
                    aria-label="Baixar planilha enviada para corrigir"
                    title="Baixar planilha enviada para corrigir"
                    @click="upload.baixarOriginal(item)"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    class="text-gray-400 transition hover:text-red-500"
                    :aria-label="item.status === 'PROCESSANDO' ? 'Cancelar envio' : 'Remover do histórico'"
                    :title="item.status === 'PROCESSANDO' ? 'Cancelar envio' : 'Remover do histórico'"
                    @click="upload.removerDoHistorico(item.id)"
                  >
                    <svg
                      v-if="item.status === 'PROCESSANDO'"
                      class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" aria-hidden="true"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                    <svg
                      v-else
                      class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" aria-hidden="true"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>

            <!-- Detalhe do erro: tabela linha a linha quando existe
                 (registros antigos só têm a mensagem em texto). -->
            <tr
              v-if="item.mensagem && detalhesAbertos.has(item.id)"
              class="bg-gray-50/60"
            >
              <td colspan="5" class="px-6 pb-5 pt-1">
                <TabelaProblemas
                  v-if="item.problemas?.length"
                  :problemas="item.problemas"
                  :total="item.totalProblemas"
                />
                <p
                  v-else
                  class="rounded-md border border-red-200 bg-white px-3 py-2 text-xs text-red-700"
                >
                  {{ item.mensagem }}
                </p>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>
