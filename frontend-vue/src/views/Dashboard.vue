<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  Chart,
  LineElement,
  PointElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js'

import { Line, Bar } from 'vue-chartjs'

Chart.register(
  LineElement,
  PointElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
)

const clientes = ref([])

const filtroSegmento = ref('Todos')
const filtroNivel = ref('Todos')

onMounted(() => {
  const dados = localStorage.getItem('ctiClientes')

  if (dados) {
    clientes.value = JSON.parse(dados)
  }
})

const segmentos = computed(() => {
  return [...new Set(
    clientes.value.map(cliente => cliente.segmento)
  )]
})

const clientesFiltrados = computed(() => {
  return clientes.value.filter(cliente => {
    const segmento =
      filtroSegmento.value === 'Todos' ||
      cliente.segmento === filtroSegmento.value

    const nivel =
      filtroNivel.value === 'Todos' ||
      cliente.nivel === filtroNivel.value

    return segmento && nivel
  })
})

const totalClientes = computed(() => {
  return clientesFiltrados.value.length
})

const clientesNivelA = computed(() => {
  return clientesFiltrados.value.filter(
    cliente => cliente.nivel === 'A'
  ).length
})

const faturamentoTotal = computed(() => {
  return clientesFiltrados.value.reduce(
    (total, cliente) => total + cliente.faturamento,
    0
  )
})

const ticketMedio = computed(() => {
  if (totalClientes.value === 0) {
    return 0
  }

  return faturamentoTotal.value / totalClientes.value
})

const graficoLinhaData = computed(() => {
  return {
    labels: clientesFiltrados.value.map(
      cliente => cliente.cliente
    ),

    datasets: [
      {
        label: 'Faturamento',

        data: clientesFiltrados.value.map(
          cliente => cliente.faturamento
        ),

        borderColor: '#F7941D',

        backgroundColor: '#F7941D',

        tension: 0.3,

        pointRadius: 4
      }
    ]
  }
})

const graficoLinhaOptions = {
  responsive: true,

  maintainAspectRatio: false,

  plugins: {
    legend: {
      display: false
    },

    tooltip: {
      callbacks: {
        label: context => {
          return `R$ ${context.raw.toLocaleString('pt-BR')}`
        }
      }
    }
  },

  scales: {
    y: {
      beginAtZero: true
    }
  }
}

const faturamentoPorSegmento = computed(() => {
  return segmentos.value.map(segmento => {
    return clientesFiltrados.value
      .filter(cliente => cliente.segmento === segmento)
      .reduce(
        (total, cliente) => total + cliente.faturamento,
        0
      )
  })
})

const graficoBarraData = computed(() => {
  return {
    labels: segmentos.value,

    datasets: [
      {
        label: 'Faturamento',

        data: faturamentoPorSegmento.value,

        backgroundColor: '#2874BE'
      }
    ]
  }
})

const graficoBarraOptions = {
  responsive: true,

  maintainAspectRatio: false,

  plugins: {
    legend: {
      display: false
    }
  },

  scales: {
    y: {
      beginAtZero: true
    }
  }
}

const maiorSegmento = computed(() => {
  if (segmentos.value.length === 0) {
    return null
  }

  let maior = null

  segmentos.value.forEach(segmento => {
    const faturamento = clientesFiltrados.value
      .filter(cliente => cliente.segmento === segmento)
      .reduce(
        (total, cliente) => total + cliente.faturamento,
        0
      )

    if (!maior || faturamento > maior.faturamento) {
      maior = {
        nome: segmento,
        faturamento
      }
    }
  })

  return maior
})

const menorSegmento = computed(() => {
  if (segmentos.value.length === 0) {
    return null
  }

  let menor = null

  segmentos.value.forEach(segmento => {
    const faturamento = clientesFiltrados.value
      .filter(cliente => cliente.segmento === segmento)
      .reduce(
        (total, cliente) => total + cliente.faturamento,
        0
      )

    if (!menor || faturamento < menor.faturamento) {
      menor = {
        nome: segmento,
        faturamento
      }
    }
  })

  return menor
})

const clientesOportunidade = computed(() => {
  return clientesFiltrados.value.filter(cliente => {
    return (
      cliente.nivel === 'B' &&
      cliente.faturamento >= 25000
    )
  })
})

const formatarMoeda = valor => {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

const limparFiltros = () => {
  filtroSegmento.value = 'Todos'
  filtroNivel.value = 'Todos'
}
</script>

<template>

  <div class="grid-background min-h-screen">

    <!-- HEADER -->

    <header class="border-b border-gray-200 bg-white">

      <div
        class="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"
      >

        <!-- Logo -->

        <RouterLink
          to="/"
          class="text-xl font-bold text-[#2874BE]"
        >
          CTI Insights<span class="text-[#F7941D]">.</span>
        </RouterLink>


        <!-- Navegação -->

        <div class="flex items-center gap-6">

          <RouterLink
            to="/upload"
            class="text-sm text-gray-500 transition hover:text-[#2874BE]"
          >
            Importar dados
          </RouterLink>

          <RouterLink
            to="/login"
            class="text-sm text-gray-500 transition hover:text-red-500"
          >
            Sair
          </RouterLink>

        </div>

      </div>

    </header>


    <!-- CONTEÚDO -->

    <main class="mx-auto max-w-7xl px-6 py-10">

      <!-- TÍTULO -->

      <h1 class="text-3xl font-bold text-[#292A2F]">
        Dashboard
      </h1>

      <p class="mt-2 text-sm text-gray-500">
        Visualização dos dados dos clientes.
      </p>


      <!-- FILTROS -->

      <div
        class="mt-6 rounded-lg border border-gray-200 bg-white p-5"
      >

        <div
          class="mb-4 flex items-center justify-between"
        >

          <h2 class="font-bold text-[#292A2F]">
            Filtros
          </h2>

          <button
            @click="limparFiltros"
            class="text-sm text-[#2874BE] transition hover:underline"
          >
            Limpar filtros
          </button>

        </div>


        <div
          class="grid grid-cols-1 gap-4 md:grid-cols-2"
        >

          <!-- Segmento -->

          <div>

            <label class="mb-2 block text-sm">
              Segmento
            </label>

            <select
              v-model="filtroSegmento"
              class="w-full rounded-md border border-gray-300 bg-white p-3 outline-none focus:border-[#2874BE]"
            >

              <option value="Todos">
                Todos
              </option>

              <option
                v-for="segmento in segmentos"
                :key="segmento"
                :value="segmento"
              >
                {{ segmento }}
              </option>

            </select>

          </div>


          <!-- Nível -->

          <div>

            <label class="mb-2 block text-sm">
              Nível
            </label>

            <select
              v-model="filtroNivel"
              class="w-full rounded-md border border-gray-300 bg-white p-3 outline-none focus:border-[#2874BE]"
            >

              <option value="Todos">
                Todos
              </option>

              <option value="A">
                A
              </option>

              <option value="B">
                B
              </option>

              <option value="C">
                C
              </option>

            </select>

          </div>

        </div>

      </div>


      <!-- KPIs -->

      <div
        class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >

        <!-- Total -->

        <div
          class="rounded-lg border border-gray-200 bg-white p-5"
        >

          <p class="text-sm text-gray-500">
            Total de clientes
          </p>

          <p class="mt-2 text-2xl font-bold">
            {{ totalClientes }}
          </p>

        </div>


        <!-- Nível A -->

        <div
          class="rounded-lg border border-gray-200 bg-white p-5"
        >

          <p class="text-sm text-gray-500">
            Clientes nível A
          </p>

          <p
            class="mt-2 text-2xl font-bold text-[#2874BE]"
          >
            {{ clientesNivelA }}
          </p>

        </div>


        <!-- Faturamento -->

        <div
          class="rounded-lg border border-gray-200 bg-white p-5"
        >

          <p class="text-sm text-gray-500">
            Faturamento total
          </p>

          <p class="mt-2 text-2xl font-bold">
            {{ formatarMoeda(faturamentoTotal) }}
          </p>

        </div>


        <!-- Ticket -->

        <div
          class="rounded-lg border border-gray-200 bg-white p-5"
        >

          <p class="text-sm text-gray-500">
            Ticket médio
          </p>

          <p class="mt-2 text-2xl font-bold">
            {{ formatarMoeda(ticketMedio) }}
          </p>

        </div>

      </div>


      <!-- GRÁFICO DE LINHA -->

      <div
        class="mt-6 rounded-lg border border-gray-200 bg-white p-6"
      >

        <h2 class="text-lg font-bold text-[#292A2F]">
          Faturamento dos clientes
        </h2>

        <p class="mt-1 text-sm text-gray-500">
          Valores de faturamento da base selecionada.
        </p>

        <div class="mt-5 h-80">

          <Line
            :data="graficoLinhaData"
            :options="graficoLinhaOptions"
          />

        </div>

      </div>


      <!-- GRÁFICO DE BARRAS -->

      <div
        class="mt-6 rounded-lg border border-gray-200 bg-white p-6"
      >

        <h2 class="text-lg font-bold text-[#292A2F]">
          Faturamento por segmento
        </h2>

        <div class="mt-5 h-80">

          <Bar
            :data="graficoBarraData"
            :options="graficoBarraOptions"
          />

        </div>

      </div>


      <!-- INSIGHTS -->

      <div
        v-if="clientesFiltrados.length"
        class="mt-6"
      >

        <h2 class="text-lg font-bold text-[#292A2F]">
          Insights
        </h2>


        <div
          class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3"
        >

          <!-- Maior -->

          <div
            class="rounded-lg border border-gray-200 bg-white p-5"
          >

            <p class="text-sm text-gray-500">
              Maior faturamento
            </p>

            <p class="mt-2 font-bold">
              {{ maiorSegmento?.nome }}
            </p>

            <p class="mt-1 text-sm text-gray-500">
              {{
                formatarMoeda(
                  maiorSegmento?.faturamento || 0
                )
              }}
            </p>

          </div>


          <!-- Oportunidade -->

          <div
            class="rounded-lg border border-gray-200 bg-white p-5"
          >

            <p class="text-sm text-gray-500">
              Oportunidade
            </p>

            <p class="mt-2 font-bold">
              {{ clientesOportunidade.length }} clientes
            </p>

            <p class="mt-1 text-sm text-gray-500">
              Clientes nível B com faturamento acima de
              R$ 25.000.
            </p>

          </div>


          <!-- Menor -->

          <div
            class="rounded-lg border border-gray-200 bg-white p-5"
          >

            <p class="text-sm text-gray-500">
              Menor faturamento
            </p>

            <p class="mt-2 font-bold">
              {{ menorSegmento?.nome }}
            </p>

            <p class="mt-1 text-sm text-gray-500">
              {{
                formatarMoeda(
                  menorSegmento?.faturamento || 0
                )
              }}
            </p>

          </div>

        </div>

      </div>


      <!-- TABELA DE CLIENTES -->

      <div
        v-if="clientesFiltrados.length"
        class="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white"
      >

        <div
          class="border-b border-gray-200 p-5"
        >

          <h2 class="text-lg font-bold text-[#292A2F]">
            Clientes
          </h2>

          <p class="mt-1 text-sm text-gray-500">
            {{ clientesFiltrados.length }}
            clientes encontrados.
          </p>

        </div>


        <div class="overflow-x-auto">

          <table class="w-full text-sm">

            <thead class="bg-gray-50">

              <tr>

                <th class="p-4 text-left">
                  Cliente
                </th>

                <th class="p-4 text-left">
                  Segmento
                </th>

                <th class="p-4 text-left">
                  Faturamento
                </th>

                <th class="p-4 text-left">
                  Nível
                </th>

              </tr>

            </thead>


            <tbody>

              <tr
                v-for="cliente in clientesFiltrados"
                :key="cliente.cliente"
                class="border-t border-gray-200"
              >

                <td class="p-4">
                  {{ cliente.cliente }}
                </td>

                <td class="p-4">
                  {{ cliente.segmento }}
                </td>

                <td class="p-4">
                  {{ formatarMoeda(cliente.faturamento) }}
                </td>

                <td class="p-4">
                  {{ cliente.nivel }}
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>


      <!-- SEM DADOS -->

      <div
        v-else
        class="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center"
      >

        <h2 class="font-bold">
          Nenhum cliente encontrado.
        </h2>

        <p class="mt-2 text-sm text-gray-500">
          Altere os filtros ou importe uma nova base.
        </p>

      </div>

    </main>

  </div>

</template>