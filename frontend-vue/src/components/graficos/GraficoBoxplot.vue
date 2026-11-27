<script setup>
// Boxplot do faturamento, desenhado em SVG (o Chart.js não tem boxplot).
// A caixa vai do Q1 ao Q3 (os 50% de clientes do meio), a linha laranja é a
// mediana, os "bigodes" vão até o último cliente dentro da regra de
// 1,5 × IQR e os pontos laranja são os clientes fora do padrão (outliers).
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { formatarMoeda, formatarMoedaCurta } from '../../utils/moeda'

const props = defineProps({
  // { minimo, q1, mediana, q3, maximo, bigodeInferior, bigodeSuperior, outliers: [{ nome, faturamento }] }
  resumo: { type: Object, default: null }
})

// O desenho usa a largura real do cartão (em pixels), para o texto do eixo
// ter sempre o mesmo tamanho, no computador e no celular
const area = ref(null)
const LARGURA = ref(640)
let observador = null
onMounted(() => {
  observador = new ResizeObserver(([entrada]) => {
    LARGURA.value = Math.max(260, Math.round(entrada.contentRect.width))
  })
  if (area.value) observador.observe(area.value)
})
onBeforeUnmount(() => observador?.disconnect())

const MARGEM = 36
const Y_CAIXA = 28
const ALTURA_CAIXA = 52
const Y_CENTRO = Y_CAIXA + ALTURA_CAIXA / 2
const Y_EIXO = 112

function passoRedondo(bruto) {
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  return [1, 2, 2.5, 5, 10].find(f => f * potencia >= bruto) * potencia
}

// Escala do eixo: do mínimo ao máximo, arredondada em ~5 marcas
const eixo = computed(() => {
  const r = props.resumo
  if (!r) return null
  const amplitude = r.maximo - r.minimo || Math.abs(r.maximo) || 1
  const passo = passoRedondo(amplitude / (LARGURA.value < 480 ? 3 : 5))
  const inicio = Math.floor(r.minimo / passo) * passo
  const fim = Math.max(inicio + passo, Math.ceil(r.maximo / passo) * passo)
  const marcas = []
  for (let v = inicio; v <= fim + passo / 2; v += passo) marcas.push(v)
  return { inicio, fim, marcas }
})

const x = valor => {
  const { inicio, fim } = eixo.value
  return MARGEM + ((valor - inicio) / (fim - inicio)) * (LARGURA.value - 2 * MARGEM)
}

const cinco = computed(() => {
  const r = props.resumo
  if (!r) return []
  return [
    { rotulo: 'Mínimo', valor: r.minimo },
    { rotulo: 'Q1 (25%)', valor: r.q1 },
    { rotulo: 'Mediana', valor: r.mediana, destaque: true },
    { rotulo: 'Q3 (75%)', valor: r.q3 },
    { rotulo: 'Máximo', valor: r.maximo }
  ]
})

const frase = computed(() => {
  const r = props.resumo
  if (!r) return ''
  const meio = `Metade dos clientes fatura entre ${formatarMoedaCurta(r.q1)} e ${formatarMoedaCurta(r.q3)}.`
  const n = r.outliers.length
  if (!n) return `${meio} Nenhum cliente fora do padrão.`
  const nomes = r.outliers.slice(0, 3).map(o => o.nome).join(', ')
  const resto = n > 3 ? ` e mais ${n - 3}` : ''
  return `${meio} ${n === 1 ? '1 cliente fora do padrão' : `${n} clientes fora do padrão`}: ${nomes}${resto}.`
})
</script>

<template>
  <article class="rounded-lg border border-gray-200 bg-white p-6">
    <h3 class="text-lg font-bold text-cti-grafite">
      Faturamento típico e fora do padrão (boxplot)
    </h3>
    <p class="mt-1 text-sm text-gray-500">
      Como ler: a caixa reúne a metade do meio dos clientes; a linha laranja é a mediana (o cliente típico); os pontos laranja são clientes muito acima ou abaixo dos demais (os nomes aparecem na frase abaixo).
    </p>

    <div ref="area">
    <template v-if="resumo">
      <svg
        :viewBox="`0 0 ${LARGURA} 140`"
        :width="LARGURA"
        height="140"
        class="mt-5 block max-w-full"
        role="img"
        :aria-label="`Boxplot do faturamento: mediana ${formatarMoeda(resumo.mediana)}, Q1 ${formatarMoeda(resumo.q1)}, Q3 ${formatarMoeda(resumo.q3)}, ${resumo.outliers.length} fora do padrão`"
      >
        <!-- eixo com as marcas de valor -->
        <line :x1="MARGEM" :x2="LARGURA - MARGEM" :y1="Y_EIXO" :y2="Y_EIXO" stroke="#CDDADF" />
        <g v-for="marca in eixo.marcas" :key="marca">
          <line :x1="x(marca)" :x2="x(marca)" :y1="Y_EIXO" :y2="Y_EIXO + 5" stroke="#A5A5A5" />
          <text :x="x(marca)" :y="Y_EIXO + 20" text-anchor="middle" font-size="12" fill="#4A5D66">
            {{ formatarMoedaCurta(marca) }}
          </text>
        </g>

        <!-- bigodes -->
        <line :x1="x(resumo.bigodeInferior)" :x2="x(resumo.q1)" :y1="Y_CENTRO" :y2="Y_CENTRO" stroke="#006EB7" stroke-width="2" />
        <line :x1="x(resumo.q3)" :x2="x(resumo.bigodeSuperior)" :y1="Y_CENTRO" :y2="Y_CENTRO" stroke="#006EB7" stroke-width="2" />
        <line :x1="x(resumo.bigodeInferior)" :x2="x(resumo.bigodeInferior)" :y1="Y_CENTRO - 12" :y2="Y_CENTRO + 12" stroke="#006EB7" stroke-width="2" />
        <line :x1="x(resumo.bigodeSuperior)" :x2="x(resumo.bigodeSuperior)" :y1="Y_CENTRO - 12" :y2="Y_CENTRO + 12" stroke="#006EB7" stroke-width="2" />

        <!-- caixa (Q1 a Q3) e mediana -->
        <rect
          :x="x(resumo.q1)"
          :y="Y_CAIXA"
          :width="Math.max(2, x(resumo.q3) - x(resumo.q1))"
          :height="ALTURA_CAIXA"
          fill="#E6F1F8"
          stroke="#006EB7"
          stroke-width="2"
          rx="3"
        />
        <line :x1="x(resumo.mediana)" :x2="x(resumo.mediana)" :y1="Y_CAIXA" :y2="Y_CAIXA + ALTURA_CAIXA" stroke="#FF8F00" stroke-width="4" />

        <!-- clientes fora do padrão -->
        <circle
          v-for="(o, i) in resumo.outliers"
          :key="`${o.nome}-${i}`"
          :cx="x(o.faturamento)"
          :cy="Y_CENTRO"
          r="6"
          fill="#FF8F00"
          fill-opacity="0.8"
          stroke="#A85700"
        >
          <title>{{ o.nome }}: {{ formatarMoeda(o.faturamento) }}</title>
        </circle>
      </svg>

      <dl class="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
        <div v-for="item in cinco" :key="item.rotulo" class="rounded-md border border-gray-100 px-3 py-2">
          <dt class="text-xs font-semibold uppercase tracking-wide" :class="item.destaque ? 'text-cti-laranja-texto' : 'text-gray-500'">
            {{ item.rotulo }}
          </dt>
          <dd class="mt-0.5 font-semibold text-cti-grafite">{{ formatarMoedaCurta(item.valor) }}</dd>
        </div>
      </dl>

      <p class="mt-4 rounded-md bg-gray-50 px-4 py-2.5 text-sm text-cti-grafite">
        {{ frase }}
      </p>
    </template>

    <p v-else class="mt-5 text-sm text-gray-500">Nenhum cliente nesta base.</p>
    </div>
  </article>
</template>
