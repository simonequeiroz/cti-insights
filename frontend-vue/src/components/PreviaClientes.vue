<script setup>
import { computed, ref, watch } from 'vue'
import { ESTILO_NIVEL, temRegistroEtl } from '../utils/resumoEtl'

// Tabela paginada da base tratada. Células que o ETL alterou ficam
// sublinhadas; passar o mouse mostra o valor como veio na planilha.
const props = defineProps({
  clientes: { type: Array, required: true }
})

const ITENS_POR_PAGINA = 10
const CAMPOS_CORRIGIVEIS = ['segmento', 'consultor', 'nivel_cliente']

const paginaAtual = ref(1)
const soCorrigidas = ref(false)

const temRegistro = computed(() => temRegistroEtl(props.clientes))

const foiCorrigida = cliente => {
  return CAMPOS_CORRIGIVEIS.some(campo => cliente.etl_original?.[campo] !== undefined)
}

const clientesFiltrados = computed(() => {
  return soCorrigidas.value ? props.clientes.filter(foiCorrigida) : props.clientes
})

const totalPaginas = computed(() => {
  return Math.max(1, Math.ceil(clientesFiltrados.value.length / ITENS_POR_PAGINA))
})

const clientesPaginados = computed(() => {
  const inicio = (paginaAtual.value - 1) * ITENS_POR_PAGINA
  return clientesFiltrados.value.slice(inicio, inicio + ITENS_POR_PAGINA)
})

// Nova base ou filtro trocado: volta pra primeira página.
watch([() => props.clientes, soCorrigidas], () => {
  paginaAtual.value = 1
})

const corrigido = (cliente, campo) => cliente.etl_original?.[campo] !== undefined

const valorOriginal = (cliente, campo) => {
  return corrigido(cliente, campo) ? `Na planilha: "${cliente.etl_original[campo]}"` : undefined
}

const formatarMoeda = valor => {
  if (valor === null || valor === undefined) return '—'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

const formatarData = iso => {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
    <div class="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-sm font-bold text-[#292A2F]">
          Prévia dos clientes
        </h3>
        <p
          v-if="temRegistro"
          class="mt-0.5 text-xs text-gray-500"
        >
          <span class="underline decoration-[#FF8F00] decoration-dotted decoration-2 underline-offset-4">Sublinhado</span>
          = corrigido pelo ETL (passe o mouse para ver o original).
        </p>
      </div>

      <label
        v-if="temRegistro"
        class="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-600"
      >
        <input
          v-model="soCorrigidas"
          type="checkbox"
          class="h-4 w-4 accent-[#006EB7]"
        />
        Só linhas corrigidas
      </label>
    </div>

    <p
      v-if="!clientesFiltrados.length"
      class="px-5 py-8 text-center text-sm text-gray-500"
    >
      Nenhuma linha precisou de correção.
    </p>

    <div
      v-else
      class="overflow-x-auto"
    >
      <table class="w-full min-w-[960px] text-left text-xs">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 font-semibold text-gray-500">Código</th>
            <th class="px-4 py-3 font-semibold text-gray-500">Cliente</th>
            <th class="px-4 py-3 font-semibold text-gray-500">Consultor</th>
            <th class="px-4 py-3 font-semibold text-gray-500">Segmento</th>
            <th class="px-4 py-3 font-semibold text-gray-500">Nível</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-500">Faturamento</th>
            <th class="px-4 py-3 font-semibold text-gray-500">Contratação</th>
            <th class="px-4 py-3 font-semibold text-gray-500">Serviços</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(cliente, indice) in clientesPaginados"
            :key="`${cliente.codigo_cliente}-${indice}`"
            class="border-t border-gray-100 align-top transition-colors hover:bg-gray-50"
          >
            <td class="px-4 py-3 font-['IBM_Plex_Mono'] text-gray-500">
              {{ cliente.codigo_cliente || '—' }}
            </td>

            <td class="px-4 py-3 font-medium text-[#292A2F]">
              {{ cliente.nome_cliente || '—' }}
            </td>

            <td class="px-4 py-3 text-gray-600">
              <span
                :class="{ 'underline decoration-[#FF8F00] decoration-dotted decoration-2 underline-offset-4': corrigido(cliente, 'consultor') }"
                :title="valorOriginal(cliente, 'consultor')"
              >
                {{ cliente.consultor || '—' }}
              </span>
            </td>

            <td class="px-4 py-3 text-gray-600">
              <span
                :class="{ 'underline decoration-[#FF8F00] decoration-dotted decoration-2 underline-offset-4': corrigido(cliente, 'segmento') }"
                :title="valorOriginal(cliente, 'segmento')"
              >
                {{ cliente.segmento || '—' }}
              </span>
            </td>

            <td class="px-4 py-3">
              <span
                class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                :class="[
                  ESTILO_NIVEL[cliente.nivel_cliente]?.selo || 'bg-gray-100 text-gray-600',
                  { 'underline decoration-[#FF8F00] decoration-dotted decoration-2 underline-offset-2': corrigido(cliente, 'nivel_cliente') }
                ]"
                :title="valorOriginal(cliente, 'nivel_cliente')"
              >
                {{ cliente.nivel_cliente || '—' }}
              </span>
            </td>

            <td class="whitespace-nowrap px-4 py-3 text-right text-gray-600">
              {{ formatarMoeda(cliente.faturamento) }}
            </td>

            <td class="whitespace-nowrap px-4 py-3 text-gray-600">
              {{ formatarData(cliente.data_contratacao) }}
            </td>

            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="servico in cliente.servicos || []"
                  :key="servico"
                  class="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600"
                >
                  {{ servico }}
                </span>
                <span
                  v-if="!cliente.servicos?.length"
                  class="text-gray-400"
                >—</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="totalPaginas > 1"
      class="flex items-center justify-between border-t border-gray-200 px-5 py-3"
    >
      <p class="text-xs text-gray-500">
        Página {{ paginaAtual }} de {{ totalPaginas }} · {{ clientesFiltrados.length }} cliente(s)
      </p>

      <div class="flex gap-2">
        <button
          type="button"
          :disabled="paginaAtual === 1"
          class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-gray-50"
          @click="paginaAtual--"
        >
          Anterior
        </button>

        <button
          type="button"
          :disabled="paginaAtual === totalPaginas"
          class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-gray-50"
          @click="paginaAtual++"
        >
          Próxima
        </button>
      </div>
    </div>
  </div>
</template>
