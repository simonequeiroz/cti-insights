<script setup>
// Histograma: faixas de faturamento e quantos clientes caem em cada uma.
// As barras ficam coladas porque as faixas são contínuas (uma termina
// onde a outra começa).
import { computed } from 'vue'
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { formatarMoedaCurta } from '../../utils/moeda'

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps({
  // [{ de, ate, clientes }]
  faixas: { type: Array, required: true }
})

const rotulo = faixa => `${formatarMoedaCurta(faixa.de)} a ${formatarMoedaCurta(faixa.ate)}`

// A faixa com mais clientes: vira a frase "Como ler" e ganha a cor forte
const maior = computed(() => props.faixas.reduce((a, b) => (b.clientes > a.clientes ? b : a), props.faixas[0]))
const total = computed(() => props.faixas.reduce((s, f) => s + f.clientes, 0))

const frase = computed(() => {
  if (!maior.value || !total.value) return ''
  const empatadas = props.faixas.filter(f => f.clientes === maior.value.clientes)
  if (empatadas.length > 1) {
    return `As faixas com mais clientes empatam com ${maior.value.clientes} cada: ${empatadas.map(rotulo).join('; ')}.`
  }
  const pct = Math.round((maior.value.clientes / total.value) * 100)
  return `A maioria está na faixa de ${rotulo(maior.value)}:${maior.value.clientes} de ${total.value} clientes (${pct}%).`
})

const dados = computed(() => ({
  labels: props.faixas.map(rotulo),
  datasets: [{
    label: 'Clientes',
    data: props.faixas.map(f => f.clientes),
    backgroundColor: props.faixas.map(f => (f.clientes === maior.value?.clientes ? '#006EB7' : '#7FB6DB')),
    borderColor: '#FFFFFF',
    borderWidth: 1,
    barPercentage: 1,
    categoryPercentage: 1
  }]
}))

const opcoes = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => `${ctx.raw} ${ctx.raw === 1 ? 'cliente' : 'clientes'}`
      }
    }
  },
  scales: {
    x: {
      title: { display: true, text: 'Faixa de faturamento anual' },
      ticks: { maxRotation: 45, minRotation: 0, autoSkip: false, font: { size: 11 } }
    },
    y: {
      beginAtZero: true,
      ticks: { precision: 0 },
      title: { display: true, text: 'Nº de clientes' }
    }
  }
}
</script>

<template>
  <article class="rounded-lg border border-gray-200 bg-white p-6">
    <h3 class="text-lg font-bold text-cti-grafite">
      Distribuição do faturamento (histograma)
    </h3>
    <p class="mt-1 text-sm text-gray-500">
      Como ler: cada barra é uma faixa de faturamento; a altura é quantos clientes estão nela.
    </p>

    <div class="mt-5 h-72">
      <Bar
        v-if="faixas.length"
        :data="dados"
        :options="opcoes"
        aria-label="Histograma: quantidade de clientes por faixa de faturamento"
        role="img"
      />
      <p v-else class="flex h-full items-center justify-center text-sm text-gray-500">
        Nenhum cliente nesta base.
      </p>
    </div>

    <p v-if="frase" class="mt-4 rounded-md bg-gray-50 px-4 py-2.5 text-sm text-cti-grafite">
      {{ frase }}
    </p>
  </article>
</template>
