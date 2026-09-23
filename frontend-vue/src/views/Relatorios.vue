<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import { limparDados as limparDadosLocais, listarClientes } from '../services/api'
import { dentroDoPeriodo, periodoInvertido } from '../utils/periodo'

const clientes = ref([])
const busca = ref('')

// Período (data de contratação), como "aaaa-mm-dd"; vazio = sem limite.
const dataInicio = ref('')
const dataFim = ref('')

const periodoAtivo = computed(() => Boolean(dataInicio.value || dataFim.value))
const periodoImpossivel = computed(() => periodoInvertido(dataInicio.value, dataFim.value))

const limparPeriodo = () => {
  dataInicio.value = ''
  dataFim.value = ''
}

onMounted(async () => {
  clientes.value = await listarClientes()
})

// Busca por nome da empresa (case-insensitive), igual ao "Buscar empresa..."
// do wireframe, combinada com o filtro de período.
const clientesFiltrados = computed(() => {
  const termo = busca.value.trim().toLowerCase()

  return clientes.value.filter(cliente => {
    const nome = !termo || cliente.nome_cliente?.toLowerCase().includes(termo)
    const periodo = dentroDoPeriodo(cliente, dataInicio.value, dataFim.value)

    return nome && periodo
  })
})

// Paginação da base de clientes detalhada
const ITENS_POR_PAGINA = 10
const paginaAtual = ref(1)

const totalPaginas = computed(() => {
  return Math.max(1, Math.ceil(clientesFiltrados.value.length / ITENS_POR_PAGINA))
})

const clientesPaginados = computed(() => {
  const inicio = (paginaAtual.value - 1) * ITENS_POR_PAGINA
  return clientesFiltrados.value.slice(inicio, inicio + ITENS_POR_PAGINA)
})

// Toda vez que a busca ou o período mudam, volta pra primeira página do resultado
watch([busca, dataInicio, dataFim], () => {
  paginaAtual.value = 1
})

const paginaAnterior = () => {
  if (paginaAtual.value > 1) paginaAtual.value--
}

const proximaPagina = () => {
  if (paginaAtual.value < totalPaginas.value) paginaAtual.value++
}

const formatarMoeda = valor => {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

const formatarData = valor => {
  if (!valor) {
    return '—'
  }

  const [ano, mes, dia] = valor.split('-')
  return `${dia}/${mes}/${ano}`
}

// Regra de negócio pra "Status", já que não guardamos cancelamento de
// contrato: um contrato é considerado Ativo se foi assinado dentro dos
// últimos 12 meses a partir de hoje. É uma aproximação declarada — não um
// dado real de cancelamento — por isso fica visível na legenda da tabela,
// não escondida como se fosse fato.
const MESES_PARA_CONSIDERAR_ATIVO = 12

const calcularStatus = dataContratacaoIso => {
  if (!dataContratacaoIso) {
    return { texto: 'Sem data', classe: 'bg-gray-100 text-gray-500' }
  }

  const [ano, mes, dia] = dataContratacaoIso.split('-').map(Number)
  const dataContrato = new Date(ano, mes - 1, dia)
  const hoje = new Date()

  const diffMeses =
    (hoje.getFullYear() - dataContrato.getFullYear()) * 12 +
    (hoje.getMonth() - dataContrato.getMonth())

  if (diffMeses <= MESES_PARA_CONSIDERAR_ATIVO) {
    return { texto: 'Ativo', classe: 'bg-green-50 text-green-600' }
  }

  return { texto: 'Inativo', classe: 'bg-red-50 text-red-500' }
}

// Zera só o localStorage DESTE navegador (clientes importados + histórico
// de upload) — não existe banco de dados ainda, então não há nada "no
// servidor" pra apagar. É ferramenta de teste, não uma funcionalidade do
// produto: quando o backend existir, isso deve ser substituído por exclusão
// de cliente individual (DELETE /api/clientes/{id}), sem mexer no histórico
// de processamento, que é log auditável e não deveria ser apagável assim.
const limparDados = async () => {
  const confirmou = window.confirm(
    'Isso vai apagar os clientes e o histórico de processamento salvos neste navegador (dados de teste locais, não há banco de dados ainda). Não tem como desfazer. Confirma?'
  )

  if (!confirmou) {
    return
  }

  await limparDadosLocais()
  clientes.value = []
}
</script>

<template>

  <div class="flex min-h-screen flex-col md:flex-row">

    <Sidebar />

    <div class="grid-background flex-1">

      <main class="mx-auto max-w-7xl px-6 py-10">

        <!-- TÍTULO -->

        <div class="flex flex-wrap items-start justify-between gap-4">

          <div>

            <h1 class="text-3xl font-bold text-[#292A2F]">
              Relatórios
            </h1>

            <p class="mt-2 text-sm text-gray-500">
              Base de clientes detalhada, com busca por empresa e por período de contratação.
            </p>

          </div>

          <div class="flex flex-wrap items-center gap-3">

            <input
              v-model="busca"
              type="search"
              placeholder="Buscar empresa..."
              aria-label="Buscar empresa"
              class="w-full max-w-xs rounded-md border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:border-[#006EB7] sm:w-64"
            />

            <label
              for="relatorio-data-inicio"
              class="flex items-center gap-2 text-sm text-gray-600"
            >
              De
              <input
                id="relatorio-data-inicio"
                v-model="dataInicio"
                type="date"
                class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#006EB7]"
              />
            </label>

            <label
              for="relatorio-data-fim"
              class="flex items-center gap-2 text-sm text-gray-600"
            >
              Até
              <input
                id="relatorio-data-fim"
                v-model="dataFim"
                type="date"
                class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#006EB7]"
              />
            </label>

            <button
              v-if="periodoAtivo"
              type="button"
              @click="limparPeriodo"
              class="text-sm text-[#006EB7] transition hover:underline"
            >
              Limpar período
            </button>

            <button
              v-if="clientes.length"
              type="button"
              @click="limparDados"
              class="text-sm font-medium text-red-500 transition hover:text-red-600"
              title="Apaga só os dados de teste salvos neste navegador — não existe banco de dados ainda"
            >
              Limpar dados locais deste navegador
            </button>

          </div>

        </div>

        <p
          v-if="periodoImpossivel"
          class="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          A data inicial é posterior à data final — nenhum cliente pode aparecer nesse período.
        </p>

        <!-- TABELA -->

        <div
          v-if="clientesFiltrados.length"
          class="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white"
        >

          <div class="border-b border-gray-200 p-5">

            <h2 class="text-lg font-bold text-[#292A2F]">
              Base de Clientes Detalhada
            </h2>

            <p class="mt-1 text-sm text-gray-500">
              {{ clientesFiltrados.length }} de {{ clientes.length }} clientes.
            </p>

            <p class="mt-1 text-xs text-gray-500">
              Status: "Ativo" = contrato assinado nos últimos {{ MESES_PARA_CONSIDERAR_ATIVO }} meses.
            </p>

          </div>

          <div class="overflow-x-auto">

            <table class="w-full min-w-[820px] text-left text-sm">

              <thead class="bg-gray-50">
                <tr>
                  <th class="p-4 font-semibold text-gray-500">
                    Código
                  </th>

                  <th class="p-4 font-semibold text-gray-500">
                    Empresa
                  </th>

                  <th class="p-4 font-semibold text-gray-500">
                    Consultor
                  </th>

                  <th class="p-4 font-semibold text-gray-500">
                    Segmento
                  </th>

                  <th class="p-4 font-semibold text-gray-500">
                    Faturamento
                  </th>

                  <th class="p-4 font-semibold text-gray-500">
                    Nível
                  </th>

                  <th class="p-4 font-semibold text-gray-500">
                    Serviço
                  </th>

                  <th class="p-4 font-semibold text-gray-500">
                    Data da contratação
                  </th>

                  <th class="p-4 font-semibold text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(cliente, indice) in clientesPaginados"
                  :key="cliente.codigo_cliente || `${cliente.nome_cliente}-${indice}`"
                  class="border-t border-gray-200 transition-colors hover:bg-gray-50"
                >
                  <td class="p-4 text-gray-500">
                    {{ cliente.codigo_cliente || '—' }}
                  </td>

                  <td class="p-4 font-medium text-[#292A2F]">
                    {{ cliente.nome_cliente }}
                  </td>

                  <td class="p-4 text-gray-500">
                    {{ cliente.consultor || '—' }}
                  </td>

                  <td class="p-4 text-gray-500">
                    {{ cliente.segmento }}
                  </td>

                  <td class="p-4 text-gray-500">
                    {{ cliente.faturamento != null ? formatarMoeda(cliente.faturamento) : '—' }}
                  </td>

                  <td class="p-4">
                    <span
                      class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#006EB7]"
                    >
                      {{ cliente.nivel_cliente }}
                    </span>
                  </td>

                  <td class="p-4 text-gray-500">
                    {{ cliente.servico || '—' }}
                  </td>

                  <td class="p-4 text-gray-500">
                    {{ formatarData(cliente.data_contratacao) }}
                  </td>

                  <td class="p-4">
                    <span
                      class="rounded-full px-3 py-1 text-xs font-semibold"
                      :class="calcularStatus(cliente.data_contratacao).classe"
                    >
                      {{ calcularStatus(cliente.data_contratacao).texto }}
                    </span>
                  </td>
                </tr>
              </tbody>

            </table>

          </div>

          <div
            v-if="totalPaginas > 1"
            class="flex items-center justify-between border-t border-gray-200 px-6 py-4"
          >
            <p class="text-xs text-gray-500">
              Página {{ paginaAtual }} de {{ totalPaginas }}
            </p>

            <div class="flex gap-2">
              <button
                type="button"
                :disabled="paginaAtual === 1"
                class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-gray-50"
                @click="paginaAnterior"
              >
                Anterior
              </button>

              <button
                type="button"
                :disabled="paginaAtual === totalPaginas"
                class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-gray-50"
                @click="proximaPagina"
              >
                Próxima
              </button>
            </div>
          </div>

        </div>

        <!-- SEM DADOS -->

        <div
          v-else
          class="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center"
        >

          <h2 class="font-bold text-[#292A2F]">
            {{ clientes.length ? 'Nenhuma empresa encontrada.' : 'Nenhum cliente encontrado.' }}
          </h2>

          <p class="mt-2 text-sm text-gray-500">
            {{ clientes.length ? 'Tente buscar por outro nome ou ajustar o período.' : 'Importe uma base na tela de Upload.' }}
          </p>

          <RouterLink
            v-if="!clientes.length"
            to="/upload"
            class="mt-6 inline-block rounded-md bg-[#006EB7] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#03558c]"
          >
            Ir para o Upload
          </RouterLink>

        </div>

      </main>

    </div>

  </div>

</template>
