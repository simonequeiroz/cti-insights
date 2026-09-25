<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import { listarClientes } from '../services/api'
import { dentroDoPeriodo, periodoInvertido } from '../utils/periodo'
import {
  Chart,
  LineElement,
  PointElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js'

import { Line, Bar, Doughnut } from 'vue-chartjs'

Chart.register(
  LineElement,
  PointElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
)

const clientes = ref([])

const filtroSegmento = ref('Todos')
const filtroNivel = ref('Todos')

// Período (data de contratação), como "aaaa-mm-dd"; vazio = sem limite.
const dataInicio = ref('')
const dataFim = ref('')

const periodoAtivo = computed(() => Boolean(dataInicio.value || dataFim.value))
const periodoImpossivel = computed(() => periodoInvertido(dataInicio.value, dataFim.value))

onMounted(async () => {
  clientes.value = await listarClientes()
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
      cliente.nivel_cliente === filtroNivel.value

    const periodo = dentroDoPeriodo(cliente, dataInicio.value, dataFim.value)

    return segmento && nivel && periodo
  })
})

// Paginação da tabela "Clientes" (a base pode ter centenas de linhas)
const ITENS_POR_PAGINA = 10
const paginaAtual = ref(1)

const totalPaginas = computed(() => {
  return Math.max(1, Math.ceil(clientesFiltrados.value.length / ITENS_POR_PAGINA))
})

const clientesPaginados = computed(() => {
  const inicio = (paginaAtual.value - 1) * ITENS_POR_PAGINA
  return clientesFiltrados.value.slice(inicio, inicio + ITENS_POR_PAGINA)
})

// Muda o filtro (segmento/nível), volta pra primeira página do resultado
watch([filtroSegmento, filtroNivel, dataInicio, dataFim], () => {
  paginaAtual.value = 1
})

const paginaAnterior = () => {
  if (paginaAtual.value > 1) paginaAtual.value--
}

const proximaPagina = () => {
  if (paginaAtual.value < totalPaginas.value) paginaAtual.value++
}

const totalClientes = computed(() => {
  return clientesFiltrados.value.length
})

// Total de serviços contratados na base filtrada: cada cliente pode ter
// vários serviços na mesma linha (lista "servicos"). Bases salvas antes
// dessa lista existir só têm o texto "servico", contado como 1.
const totalServicos = computed(() => {
  return clientesFiltrados.value.reduce(
    (total, cliente) => total + (cliente.servicos?.length ?? (cliente.servico ? 1 : 0)),
    0
  )
})

// Este modelo de aula não exige faturamento (o exemplo da professora só
// trata consultor/segmento/nivel_cliente) — clientes sem essa coluna
// preenchida entram como 0, em vez de quebrar a soma com NaN.
const faturamentoTotal = computed(() => {
  return clientesFiltrados.value.reduce(
    (total, cliente) => total + (cliente.faturamento || 0),
    0
  )
})

const ticketMedio = computed(() => {
  if (totalClientes.value === 0) {
    return 0
  }

  return faturamentoTotal.value / totalClientes.value
})

// Evolução das contratações: conta quantos contratos (linhas da base)
// começaram em cada mês, a partir de "data_contratacao" (equivalente ao
// atributo Contrato.dataInicio do diagrama de classes).
const mesesAbreviados = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez'
]

const formatarPeriodo = chave => {
  const [ano, mes] = chave.split('-')
  return `${mesesAbreviados[Number(mes) - 1]}/${ano}`
}

const evolucaoContratacoes = computed(() => {
  const contagemPorPeriodo = {}

  clientesFiltrados.value.forEach(cliente => {
    if (!cliente.data_contratacao) {
      return
    }

    const periodo = cliente.data_contratacao.slice(0, 7) // aaaa-mm

    contagemPorPeriodo[periodo] =
      (contagemPorPeriodo[periodo] || 0) + 1
  })

  return Object.keys(contagemPorPeriodo)
    .sort()
    .map(periodo => ({
      periodo,
      label: formatarPeriodo(periodo),
      contratos: contagemPorPeriodo[periodo]
    }))
})

const graficoLinhaData = computed(() => {
  return {
    labels: evolucaoContratacoes.value.map(item => item.label),

    datasets: [
      {
        label: 'Contratos fechados',

        data: evolucaoContratacoes.value.map(item => item.contratos),

        borderColor: '#FF8F00',

        backgroundColor: '#FF8F00',

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
      display: true,
      position: 'bottom',
      labels: {
        usePointStyle: true
      }
    },

    tooltip: {
      callbacks: {
        label: context => {
          const total = context.raw
          return `${total} contrato${total === 1 ? '' : 's'}`
        }
      }
    }
  },

  scales: {
    x: {
      title: {
        display: true,
        text: 'Período (mês/ano)'
      }
    },

    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Quantidade de contratos'
      },
      ticks: {
        stepSize: 1
      }
    }
  }
}

const faturamentoPorSegmento = computed(() => {
  return segmentos.value.map(segmento => {
    return clientesFiltrados.value
      .filter(cliente => cliente.segmento === segmento)
      .reduce(
        (total, cliente) => total + (cliente.faturamento || 0),
        0
      )
  })
})

// Paleta cíclica pros segmentos do donut — a base real pode trazer mais
// segmentos do que a paleta tem cores, por isso o módulo (%) no índice.
const PALETA_SEGMENTOS = [
  '#006EB7', '#FF8F00', '#82CC12', '#8B5CF6',
  '#14B8A6', '#EF4444', '#F59E0B', '#64748B'
]

const corSegmento = indice => PALETA_SEGMENTOS[indice % PALETA_SEGMENTOS.length]

const graficoDonutData = computed(() => {
  return {
    labels: segmentos.value,

    datasets: [
      {
        data: faturamentoPorSegmento.value,

        backgroundColor: segmentos.value.map((_, indice) => corSegmento(indice)),

        borderWidth: 0
      }
    ]
  }
})

const graficoDonutOptions = {
  responsive: true,

  maintainAspectRatio: false,

  cutout: '70%',

  plugins: {
    legend: {
      display: false
    },

    tooltip: {
      callbacks: {
        label: context => {
          const percentual = faturamentoTotal.value
            ? ((context.raw / faturamentoTotal.value) * 100).toFixed(0)
            : 0
          return `${formatarMoeda(context.raw)} (${percentual}%)`
        }
      }
    }
  }
}

// Legenda customizada do donut (nome do segmento, cor e % do faturamento
// total) — o Chart.js não desenha a legenda igual ao protótipo, então essa
// lista substitui a legend padrão dele.
const legendaSegmentos = computed(() => {
  return segmentos.value.map((segmento, indice) => {
    const valor = faturamentoPorSegmento.value[indice]

    const percentual = faturamentoTotal.value
      ? Math.round((valor / faturamentoTotal.value) * 100)
      : 0

    return { segmento, percentual, cor: corSegmento(indice) }
  }).sort((a, b) => b.percentual - a.percentual)
})

// Faturamento total em formato compacto (R$ 2.4M / R$ 850K) pro centro do
// donut, igual ao protótipo do Figma.
const formatarMoedaCompacta = valor => {
  if (valor >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toFixed(1).replace('.', ',')}M`
  }

  if (valor >= 1_000) {
    return `R$ ${(valor / 1_000).toFixed(0)}K`
  }

  return formatarMoeda(valor)
}

// Distribuição por nível A/B/C: quantos clientes (contagem, não faturamento)
// caem em cada classificação — gráfico exigido pelo plano de ensino junto
// com "distribuição por segmento" e "evolução de contratações".
const distribuicaoPorNivel = computed(() => {
  const niveis = ['A', 'B', 'C']

  return niveis.map(nivel => {
    return clientesFiltrados.value.filter(
      cliente => cliente.nivel_cliente === nivel
    ).length
  })
})

// Curva ABC: % acumulado do faturamento total à medida que se soma a
// Classe A, depois A+B, depois A+B+C (chega em 100% se todo cliente tiver
// nível preenchido). É a curva de Pareto do protótipo, sobreposta às
// barras de contagem que o plano de ensino já pedia.
const faturamentoAcumuladoPorNivel = computed(() => {
  const niveis = ['A', 'B', 'C']

  if (faturamentoTotal.value === 0) {
    return niveis.map(() => 0)
  }

  let acumulado = 0

  return niveis.map(nivel => {
    acumulado += clientesFiltrados.value
      .filter(cliente => cliente.nivel_cliente === nivel)
      .reduce((total, cliente) => total + (cliente.faturamento || 0), 0)

    return Math.round((acumulado / faturamentoTotal.value) * 100)
  })
})

const graficoNivelData = computed(() => {
  return {
    labels: ['Nível A', 'Nível B', 'Nível C'],

    datasets: [
      {
        type: 'bar',

        label: 'Clientes',

        data: distribuicaoPorNivel.value,

        backgroundColor: ['#006EB7', '#FF8F00', '#94A3B8'],

        yAxisID: 'y'
      },
      {
        type: 'line',

        label: '% acumulado do faturamento',

        data: faturamentoAcumuladoPorNivel.value,

        borderColor: '#FF8F00',

        backgroundColor: '#FF8F00',

        tension: 0.3,

        pointRadius: 4,

        fill: false,

        yAxisID: 'y1'
      }
    ]
  }
})

const graficoNivelOptions = {
  responsive: true,

  maintainAspectRatio: false,

  plugins: {
    legend: {
      display: false
    },

    tooltip: {
      callbacks: {
        label: context => {
          if (context.dataset.type === 'line') {
            return `${context.raw}% acumulado do faturamento`
          }

          const total = context.raw
          return `${total} cliente${total === 1 ? '' : 's'}`
        }
      }
    }
  },

  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1
      }
    },

    y1: {
      position: 'right',
      min: 0,
      max: 100,
      grid: {
        drawOnChartArea: false
      },
      ticks: {
        callback: valor => `${valor}%`
      }
    }
  }
}

// Top 5 serviços por faturamento: soma o faturamento por serviço contratado
// e ordena do maior pro menor. Clientes sem serviço preenchido são ignorados
// aqui. Quando um cliente tem mais de um serviço na mesma linha (ex.:
// "Internet Dedicada;Firewall"), o faturamento do cliente é dividido em
// partes iguais entre eles — não temos o valor de cada serviço individual,
// então essa é uma estimativa declarada, não o valor exato de cada um.
const top5Servicos = computed(() => {
  const faturamentoPorServico = {}

  clientesFiltrados.value.forEach(cliente => {
    const lista = cliente.servicos?.length ? cliente.servicos : (cliente.servico ? [cliente.servico] : [])

    if (lista.length === 0) {
      return
    }

    const parcela = (cliente.faturamento || 0) / lista.length

    lista.forEach(servico => {
      faturamentoPorServico[servico] = (faturamentoPorServico[servico] || 0) + parcela
    })
  })

  const ranking = Object.entries(faturamentoPorServico)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const maiorValor = ranking.length ? ranking[0][1] : 0

  return ranking.map(([servico, valor]) => ({
    servico,
    valor,
    percentual: maiorValor > 0 ? (valor / maiorValor) * 100 : 0
  }))
})

const clientesOportunidade = computed(() => {
  return clientesFiltrados.value.filter(cliente => {
    return (
      cliente.nivel_cliente === 'B' &&
      (cliente.faturamento || 0) >= 25000
    )
  })
})

// "Insights Inteligentes": 4 cartões calculados a partir dos dados reais da
// base filtrada.
const percentualFaturamentoNivelA = computed(() => {
  if (faturamentoTotal.value === 0) {
    return 0
  }

  const faturamentoNivelA = clientesFiltrados.value
    .filter(cliente => cliente.nivel_cliente === 'A')
    .reduce((total, cliente) => total + (cliente.faturamento || 0), 0)

  return (faturamentoNivelA / faturamentoTotal.value) * 100
})

const percentualOportunidade = computed(() => {
  if (totalClientes.value === 0) {
    return 0
  }

  return (clientesOportunidade.value.length / totalClientes.value) * 100
})

const percentualServicoTop = computed(() => {
  if (!top5Servicos.value.length || faturamentoTotal.value === 0) {
    return 0
  }

  return (top5Servicos.value[0].valor / faturamentoTotal.value) * 100
})

// Crescimento de contratações: compara os dois últimos períodos que já
// existem dentro da própria base enviada (não precisa de histórico entre
// uploads — cada contrato já tem sua própria data). Só calcula de verdade
// quando há pelo menos 2 meses diferentes nos dados; senão, avisa em vez
// de inventar um número.
const crescimentoContratacoes = computed(() => {
  const periodos = evolucaoContratacoes.value

  if (periodos.length < 2) {
    return null
  }

  const atual = periodos[periodos.length - 1]
  const anterior = periodos[periodos.length - 2]

  if (anterior.contratos === 0) {
    return null
  }

  return {
    periodoAtual: atual.label,
    periodoAnterior: anterior.label,
    variacao: ((atual.contratos - anterior.contratos) / anterior.contratos) * 100
  }
})

const insights = computed(() => {
  return [
    {
      titulo: 'Concentração de Receita',
      descricao: totalClientes.value === 0
        ? 'Sem dados suficientes na base selecionada.'
        : `${percentualFaturamentoNivelA.value.toFixed(0)}% do faturamento está concentrado na Classe A de clientes.`
    },
    {
      titulo: 'Serviço de Maior Faturamento',
      descricao: top5Servicos.value.length
        ? `${top5Servicos.value[0].servico} responde por ${percentualServicoTop.value.toFixed(0)}% do faturamento da base.`
        : 'Nenhum serviço encontrado nesta base.'
    },
    {
      titulo: 'Oportunidade de Upsell',
      descricao: totalClientes.value === 0
        ? 'Sem dados suficientes na base selecionada.'
        : `${clientesOportunidade.value.length} clientes (${percentualOportunidade.value.toFixed(0)}% da base) estão no Nível B com faturamento acima de R$ 25.000 — candidatos a upgrade.`
    },
    {
      titulo: 'Crescimento de Contratações',
      descricao: crescimentoContratacoes.value
        ? `${crescimentoContratacoes.value.variacao >= 0 ? '+' : ''}${crescimentoContratacoes.value.variacao.toFixed(0)}% de contratos entre ${crescimentoContratacoes.value.periodoAnterior} e ${crescimentoContratacoes.value.periodoAtual}.`
        : 'Ainda não há dois períodos na base para comparar crescimento.'
    }
  ]
})

const formatarMoeda = valor => {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

// Para os cartões de KPI: sem centavos ("R$ 2.458.760"), como no Figma.
// O valor exato continua nas tabelas e nos tooltips dos gráficos.
const formatarMoedaInteira = valor => {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  })
}

const formatarData = valor => {
  if (!valor) {
    return '—'
  }

  const [ano, mes, dia] = valor.split('-')
  return `${dia}/${mes}/${ano}`
}

const limparFiltros = () => {
  filtroSegmento.value = 'Todos'
  filtroNivel.value = 'Todos'
  dataInicio.value = ''
  dataFim.value = ''
}

// "Exportar PDF" via impressão nativa do navegador: não exige nenhuma
// biblioteca nova, e a folha de estilo @media print (style.css) já esconde
// sidebar, filtros e botões, deixando só KPIs/gráficos/tabela na página.
const exportarPDF = () => {
  window.print()
}

// Exporta a base filtrada como CSV. Usa ; como separador de coluna (não ,)
// porque o Excel em português usa a vírgula como separador decimal — com
// vírgula separando colunas, o Excel BR não reconhece e joga tudo numa
// coluna só ao abrir o arquivo. Aspas em volta de cada valor evitam o
// mesmo problema que o parser de upload tem com ; dentro de campos (ex.:
// serviços separados por ;); o BOM é pra o Excel reconhecer acentuação
// em UTF-8 corretamente.
const exportarCSV = () => {
  const cabecalho = [
    'Código', 'Cliente', 'Consultor', 'Segmento', 'Faturamento', 'Nível', 'Data da contratação', 'Serviço'
  ]

  const escapar = valor => `"${String(valor ?? '').replace(/"/g, '""')}"`

  // Ponto decimal -> vírgula, pro Excel BR reconhecer como número e não como texto
  const formatarNumeroCsv = valor => {
    return valor === null || valor === undefined ? '' : String(valor).replace('.', ',')
  }

  const linhas = clientesFiltrados.value.map(cliente => [
    cliente.codigo_cliente || '',
    cliente.nome_cliente,
    cliente.consultor || '',
    cliente.segmento,
    formatarNumeroCsv(cliente.faturamento),
    cliente.nivel_cliente,
    formatarData(cliente.data_contratacao),
    cliente.servico || ''
  ].map(escapar).join(';'))

  const csv = [cabecalho.map(escapar).join(';'), ...linhas].join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `cti-insights-clientes-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()

  URL.revokeObjectURL(url)
}
</script>

<template>

  <div class="flex min-h-screen flex-col md:flex-row">

    <Sidebar class="no-print" />

    <div class="grid-background flex-1">

    <!-- CONTEÚDO -->

    <main class="mx-auto max-w-7xl px-6 py-10">

      <!-- TÍTULO -->

      <div class="flex flex-wrap items-start justify-between gap-4">

        <div>

          <h1 class="text-3xl font-bold text-[#292A2F]">
            Dashboard Executivo
          </h1>

          <p class="mt-2 text-sm text-gray-500">
            Visão geral de performance comercial e recomendações em tempo real.
          </p>

        </div>

        <!-- Filtros + exportar: compactos, na mesma linha do título,
             igual ao seletor de período do Figma ao lado do "Exportar PDF" -->

        <div
          v-if="clientes.length"
          class="no-print flex flex-wrap items-center gap-3"
        >

          <label
            for="filtro-segmento"
            class="sr-only"
          >
            Segmento
          </label>

          <select
            id="filtro-segmento"
            v-model="filtroSegmento"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#006EB7]"
          >

            <option value="Todos">
              Todos os segmentos
            </option>

            <option
              v-for="segmento in segmentos"
              :key="segmento"
              :value="segmento"
            >
              {{ segmento }}
            </option>

          </select>

          <label
            for="filtro-nivel"
            class="sr-only"
          >
            Nível
          </label>

          <select
            id="filtro-nivel"
            v-model="filtroNivel"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#006EB7]"
          >

            <option value="Todos">
              Todos os níveis
            </option>

            <option value="A">
              Nível A
            </option>

            <option value="B">
              Nível B
            </option>

            <option value="C">
              Nível C
            </option>

          </select>

          <!-- Período: filtra pela data de contratação -->

          <label
            for="filtro-data-inicio"
            class="flex items-center gap-2 text-sm text-gray-600"
          >
            De
            <input
              id="filtro-data-inicio"
              v-model="dataInicio"
              type="date"
              class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#006EB7]"
            />
          </label>

          <label
            for="filtro-data-fim"
            class="flex items-center gap-2 text-sm text-gray-600"
          >
            Até
            <input
              id="filtro-data-fim"
              v-model="dataFim"
              type="date"
              class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#006EB7]"
            />
          </label>

          <button
            v-if="filtroSegmento !== 'Todos' || filtroNivel !== 'Todos' || periodoAtivo"
            type="button"
            @click="limparFiltros"
            class="text-sm text-[#006EB7] transition hover:underline"
          >
            Limpar
          </button>

          <button
            type="button"
            @click="exportarCSV"
            class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#006EB7] hover:text-[#006EB7]"
          >
            Exportar CSV
          </button>

          <button
            type="button"
            @click="exportarPDF"
            class="rounded-md bg-[#FF8F00] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#E68100]"
          >
            Exportar PDF
          </button>

        </div>

      </div>


      <!-- Avisos do filtro de período -->

      <p
        v-if="periodoImpossivel"
        class="no-print mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
      >
        A data inicial é posterior à data final — nenhum cliente pode aparecer nesse período.
      </p>

      <p
        v-else-if="periodoAtivo"
        class="mt-4 text-xs text-gray-500"
      >
        Período filtrado pela data de contratação. O faturamento exibido é o
        faturamento anual de cada cliente contratado no período, não a receita
        gerada nele.
      </p>


      <!-- SEM DADOS: guia o usuário até o Upload em vez de mostrar KPIs zerados -->

      <div
        v-if="!clientes.length"
        class="mt-6 rounded-lg border border-gray-200 bg-white p-10 text-center"
      >

        <h2 class="text-lg font-bold text-[#292A2F]">
          Nenhum dado importado ainda
        </h2>

        <p class="mx-auto mt-2 max-w-md text-sm text-gray-500">
          Importe a base de clientes para ver faturamento, distribuição por nível
          e insights de oportunidade.
        </p>

        <RouterLink
          to="/upload"
          class="mt-6 inline-block rounded-md bg-[#006EB7] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#03558c]"
        >
          Ir para o Upload
        </RouterLink>

      </div>


      <!-- KPIs, GRÁFICOS e, abaixo deles, INSIGHTS INTELIGENTES, todos na
           largura toda. As grades internas respondem à largura deste bloco
           (@container), não da janela, porque o menu lateral ocupa parte
           da tela. -->

      <div
        v-if="clientes.length"
        class="@container mt-6 space-y-5"
      >

      <div class="space-y-5">

      <!-- KPIs -->

      <div
        class="grid grid-cols-1 gap-5 @sm:grid-cols-2 @xl:grid-cols-4"
      >

        <!-- Total -->

        <div
          class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >

          <p class="text-xs text-gray-500">
            Faturamento Total
          </p>

          <p class="mt-2 text-base font-bold whitespace-nowrap text-[#292A2F]">
            {{ formatarMoedaInteira(faturamentoTotal) }}
          </p>

        </div>


        <!-- Total de clientes -->

        <div
          class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >

          <p class="text-xs text-gray-500">
            Clientes Ativos
          </p>

          <p class="mt-2 text-base font-bold whitespace-nowrap text-[#292A2F]">
            {{ totalClientes }}
          </p>

        </div>


        <!-- Serviços contratados -->

        <div
          class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >

          <p class="text-xs text-gray-500">
            Serviços Contratados
          </p>

          <p
            class="mt-2 text-base font-bold whitespace-nowrap text-[#292A2F]"
          >
            {{ totalServicos }}
          </p>

        </div>


        <!-- Ticket -->

        <div
          class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >

          <p class="text-xs text-gray-500">
            Ticket Médio
          </p>

          <p class="mt-2 text-base font-bold whitespace-nowrap text-[#292A2F]">
            {{ formatarMoedaInteira(ticketMedio) }}
          </p>

        </div>

      </div>


      <!-- GRÁFICOS: grade 2x2, igual ao Figma
           (Faturamento por segmento / Evolução das contratações /
           Distribuição por nível A/B/C / Top 5 Serviços por Faturamento) -->

      <div class="grid grid-cols-1 gap-5 @xl:grid-cols-2">

        <!-- GRÁFICO DE ROSCA: SEGMENTO -->

        <div class="flex flex-col rounded-lg border border-gray-200 bg-white p-6">

          <h2 class="text-lg font-bold text-[#292A2F]">
            Faturamento por segmento
          </h2>

          <div class="mt-5 flex flex-1 items-center gap-6 @xl:@max-3xl:gap-4">

            <div class="relative h-44 w-44 @xl:@max-3xl:h-36 @xl:@max-3xl:w-36 flex-shrink-0">

              <Doughnut
                :data="graficoDonutData"
                :options="graficoDonutOptions"
              />

              <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-base font-bold text-[#292A2F]">
                  {{ formatarMoedaCompacta(faturamentoTotal) }}
                </span>
                <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Total
                </span>
              </div>

            </div>

            <div class="min-w-0 flex-1 space-y-2.5">

              <div
                v-for="item in legendaSegmentos"
                :key="item.segmento"
                class="flex items-center justify-between gap-3 text-sm"
              >
                <span class="flex min-w-0 items-center gap-2 text-gray-600">
                  <span
                    class="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    :style="{ backgroundColor: item.cor }"
                  ></span>
                  <span class="truncate">{{ item.segmento }}</span>
                </span>

                <span class="flex-shrink-0 font-semibold text-[#292A2F]">
                  {{ item.percentual }}%
                </span>
              </div>

              <p v-if="!legendaSegmentos.length" class="text-sm text-gray-500">
                Nenhum dado nesta base.
              </p>

            </div>

          </div>

        </div>


        <!-- GRÁFICO DE LINHA: EVOLUÇÃO DAS CONTRATAÇÕES -->

        <div class="rounded-lg border border-gray-200 bg-white p-6">

          <h2 class="text-lg font-bold text-[#292A2F]">
            Evolução das contratações
          </h2>

          <p class="mt-1 text-sm text-gray-500 @xl:@max-3xl:hidden">
            Número de contratos fechados por período na base selecionada.
          </p>

          <div class="mt-5 h-80 @xl:@max-3xl:h-56">

            <Line
              v-if="evolucaoContratacoes.length"
              :data="graficoLinhaData"
              :options="graficoLinhaOptions"
            />

            <p
              v-else
              class="flex h-full items-center justify-center text-center text-sm text-gray-500"
            >
              Nenhuma data de contratação encontrada nesta base.<br />
              Reenvie a planilha com a coluna "Data da contratação".
            </p>

          </div>

        </div>


        <!-- GRÁFICO DE NÍVEL A/B/C -->

        <div class="rounded-lg border border-gray-200 bg-white p-6">

          <h2 class="text-lg font-bold text-[#292A2F]">
            Distribuição por nível A/B/C
          </h2>

          <p class="mt-1 text-sm text-gray-500 @xl:@max-3xl:hidden">
            Quantidade de clientes em cada classificação, na base selecionada.
          </p>

          <div class="mt-5 h-80 @xl:@max-3xl:h-56">

            <Bar
              :data="graficoNivelData"
              :options="graficoNivelOptions"
            />

          </div>

        </div>


        <!-- TOP 5 SERVIÇOS POR FATURAMENTO -->

        <div class="rounded-lg border border-gray-200 bg-white p-6">

          <h2 class="text-lg font-bold text-[#292A2F]">
            Top 5 serviços por faturamento
          </h2>

          <p class="mt-1 text-sm text-gray-500 @xl:@max-3xl:hidden">
            Serviços que mais faturam na base selecionada.
          </p>

          <p class="mt-1 text-xs text-gray-500">
            Cliente com mais de um serviço: faturamento dividido em partes iguais entre eles (estimativa).
          </p>

          <div class="mt-5 h-80 overflow-y-auto @xl:@max-3xl:h-64">

            <ul
              v-if="top5Servicos.length"
              class="space-y-4"
            >

              <li
                v-for="(item, indice) in top5Servicos"
                :key="item.servico"
              >

                <div class="flex items-center justify-between text-sm">

                  <span class="font-medium text-[#292A2F]">
                    {{ item.servico }}
                  </span>

                  <span class="text-gray-500">
                    {{ formatarMoeda(item.valor) }}
                  </span>

                </div>

                <div class="mt-2 h-2 rounded-full bg-gray-100">
                  <div
                    class="h-2 rounded-full"
                    :style="{ width: item.percentual + '%', backgroundColor: corSegmento(indice) }"
                  ></div>
                </div>

              </li>

            </ul>

            <p
              v-else
              class="flex h-full items-center justify-center text-center text-sm text-gray-500"
            >
              Nenhum serviço encontrado nesta base.<br />
              Reenvie a planilha com a coluna "Serviço".
            </p>

          </div>

        </div>

      </div>

      </div>


      <!-- INSIGHTS INTELIGENTES -->

      <div class="rounded-lg border border-gray-200 bg-white p-6">

        <h2 class="text-lg font-bold text-[#292A2F]">
          Insights Inteligentes
        </h2>

        <div class="mt-5 grid grid-cols-1 gap-3 @2xl:grid-cols-2 @5xl:grid-cols-4">

          <div
            v-for="insight in insights"
            :key="insight.titulo"
            class="flex gap-3 rounded-lg bg-white p-4 shadow-md shadow-gray-200/60 ring-1 ring-gray-100"
          >

            <span class="w-1.5 flex-shrink-0 rounded-full bg-[#FF8F00]"></span>

            <div class="min-w-0">

              <p class="text-sm font-bold text-[#006EB7]">
                {{ insight.titulo }}
              </p>

              <p class="mt-1 text-sm text-gray-500">
                {{ insight.descricao }}
              </p>

            </div>

          </div>

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

                <th class="p-4 text-left font-semibold text-gray-500">
                  Cliente
                </th>

                <th class="p-4 text-left font-semibold text-gray-500">
                  Segmento
                </th>

                <th class="p-4 text-left font-semibold text-gray-500">
                  Faturamento
                </th>

                <th class="p-4 text-left font-semibold text-gray-500">
                  Nível
                </th>

                <th class="p-4 text-left font-semibold text-gray-500">
                  Data da contratação
                </th>

                <th class="p-4 text-left font-semibold text-gray-500">
                  Serviço
                </th>

              </tr>

            </thead>


            <tbody>

              <tr
                v-for="cliente in clientesPaginados"
                :key="cliente.codigo_cliente || cliente.nome_cliente"
                class="border-t border-gray-200 transition-colors hover:bg-gray-50"
              >

                <td class="p-4 font-medium text-[#292A2F]">
                  {{ cliente.nome_cliente }}
                </td>

                <td class="p-4 text-gray-500">
                  {{ cliente.segmento }}
                </td>

                <td class="p-4 text-gray-500">
                  {{ cliente.faturamento != null ? formatarMoeda(cliente.faturamento) : '—' }}
                </td>

                <td class="p-4">
                  <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#006EB7]">
                    {{ cliente.nivel_cliente }}
                  </span>
                </td>

                <td class="p-4 text-gray-500">
                  {{ formatarData(cliente.data_contratacao) }}
                </td>

                <td class="p-4 text-gray-500">
                  {{ cliente.servico || '—' }}
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

        <h2 class="font-bold">
          Nenhum cliente encontrado.
        </h2>

        <p class="mt-2 text-sm text-gray-500">
          Altere os filtros ou importe uma nova base.
        </p>

      </div>

    </main>

    </div>

  </div>

</template>