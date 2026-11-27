<script setup>
// Dispersão: um ponto por cliente, com o nº de serviços (eixo de baixo) e o
// faturamento (eixo do lado). Mostra se quem tem mais serviços fatura mais.
import { computed } from 'vue'
import { Chart, PointElement, LinearScale, Tooltip } from 'chart.js'
import { Scatter } from 'vue-chartjs'
import { interpretarCorrelacao } from '../../utils/estatistica'
import { formatarMoeda, formatarMoedaCurta } from '../../utils/moeda'

Chart.register(PointElement, LinearScale, Tooltip)

const props = defineProps({
  // [{ nome, servicos, faturamento }]
  pontos: { type: Array, required: true },
  // { pearson, p, n } ou null
  correlacao: { type: Object, default: null }
})

const frase = computed(() => interpretarCorrelacao(props.correlacao))

const numeros = computed(() => {
  const c = props.correlacao
  if (!c || c.pearson === null || c.pearson === undefined) return ''
  const r = c.pearson.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  const p = c.p === null || c.p === undefined
    ? ''
    : c.p < 0.001 ? ' · p < 0,001' : ` · p = ${c.p.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}`
  return `r de Pearson = ${r}${p}`
})

const maxServicos = computed(() => Math.max(1, ...props.pontos.map(p => p.servicos)))

const dados = computed(() => ({
  datasets: [{
    label: 'Clientes',
    data: props.pontos.map(p => ({ x: p.servicos, y: p.faturamento, nome: p.nome })),
    // Semitransparente: pontos no mesmo lugar ficam mais escuros
    backgroundColor: 'rgba(0, 110, 183, 0.45)',
    borderColor: '#006EB7',
    pointRadius: 6,
    pointHoverRadius: 8
  }]
}))

const opcoes = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => `${ctx.raw.nome}: ${ctx.raw.x} ${ctx.raw.x === 1 ? 'serviço' : 'serviços'}, ${formatarMoeda(ctx.raw.y)}`
      }
    }
  },
  scales: {
    x: {
      type: 'linear',
      min: 0,
      max: maxServicos.value + 1,
      ticks: { stepSize: 1, precision: 0 },
      title: { display: true, text: 'Nº de serviços contratados' }
    },
    y: {
      beginAtZero: true,
      ticks: { callback: valor => formatarMoedaCurta(valor) },
      title: { display: true, text: 'Faturamento anual' }
    }
  }
}))
</script>

<template>
  <article class="rounded-lg border border-gray-200 bg-white p-6">
    <h3 class="text-lg font-bold text-[#292A2F]">
      Serviços × faturamento (dispersão)
    </h3>
    <p class="mt-1 text-sm text-gray-500">
      Como ler: cada ponto é um cliente. Se os pontos subirem da esquerda para a direita, quem tem mais serviços fatura mais.
    </p>

    <div class="mt-5 h-72">
      <Scatter
        v-if="pontos.length"
        :data="dados"
        :options="opcoes"
        aria-label="Gráfico de dispersão: número de serviços por faturamento de cada cliente"
        role="img"
      />
      <p v-else class="flex h-full items-center justify-center text-sm text-gray-500">
        Nenhum cliente nesta base.
      </p>
    </div>

    <p class="mt-4 rounded-md bg-gray-50 px-4 py-2.5 text-sm text-[#292A2F]">
      {{ frase }}
      <span v-if="numeros" class="block text-xs text-gray-500">{{ numeros }} · {{ pontos.length }} clientes</span>
    </p>
  </article>
</template>
