<script setup>
import { computed, onMounted, ref } from 'vue'
import { lerDashboard, USAR_MOCK } from '../services/api'
import Sidebar from '../components/Sidebar.vue'
import CardIndicador from '../components/CardIndicador.vue'
import { useAuthStore } from '../stores/authStore'
import { useClientesStore } from '../stores/clientesStore'
import { contar, formatarDataHora } from '../utils/datas'
import { dentroDoPeriodo, periodoInvertido } from '../utils/periodo'
import { analisarUpsell } from '../utils/upsell'
import { exportarClientesCsv } from '../utils/exportarCsv'
import { correlacaoPearson, faixasHistograma, pontosDispersao, resumoBoxplot } from '../utils/estatistica'
import GraficoDispersao from '../components/graficos/GraficoDispersao.vue'
import GraficoHistograma from '../components/graficos/GraficoHistograma.vue'
import GraficoBoxplot from '../components/graficos/GraficoBoxplot.vue'
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

import { Bar, Doughnut } from 'vue-chartjs'

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

// Base de clientes: vem do clientesStore (a mesma que Relatórios e a
// importação usam). Continua "clientes.value" no resto do arquivo.
const clientesStore = useClientesStore()
const clientes = computed(() => clientesStore.lista)

// Só Consultor e Administrador importam planilhas (utils/papeis.js)
const auth = useAuthStore()

const filtroSegmento = ref('Todos')
const filtroNivel = ref('Todos')

// Período (data de contratação), como "aaaa-mm-dd"; vazio = sem limite.
const dataInicio = ref('')
const dataFim = ref('')

const periodoAtivo = computed(() => Boolean(dataInicio.value || dataFim.value))
const periodoImpossivel = computed(() => periodoInvertido(dataInicio.value, dataFim.value))

const dashboard = ref(null)
const erroDashboard = ref('')
const estatisticas = computed(() =>
  filtroSegmento.value === 'Todos' && filtroNivel.value === 'Todos' && !periodoAtivo.value
    ? dashboard.value?.estatisticas
    : null
)

onMounted(async () => {
  try {
    const [, resultado] = await Promise.all([
      clientesStore.carregar(),
      USAR_MOCK ? null : lerDashboard()
    ])
    dashboard.value = resultado
  } catch (erro) {
    erroDashboard.value = erro.message
  }
})

// De onde vêm os números: o envio mais recente (planilha ou alteração na
// tela Clientes). Só no modo API, que tem esse registro.
const ALTERACOES_MANUAIS = {
  CRIACAO_CLIENTE: 'inclusão de cliente',
  EDICAO_CLIENTE: 'edição de cliente',
  EXCLUSAO_CLIENTE: 'exclusão de cliente'
}

const origemDosDados = computed(() => {
  const envio = dashboard.value?.envio
  if (!envio) return ''
  const origem = ALTERACOES_MANUAIS[envio.tipoOperacao]
    ? `última alteração na tela Clientes (${ALTERACOES_MANUAIS[envio.tipoOperacao]})`
    : envio.nomeArquivo
  const quem = typeof envio.enviadoPor === 'string' ? envio.enviadoPor : envio.enviadoPor?.nome
  return `Base: ${origem} · ${formatarDataHora(envio.dataHora)}${quem ? ` por ${quem}` : ''}`
})

// Com filtro ativo, os números e gráficos são da seleção, mas os insights
// escritos pelo Python são da carteira inteira: a tela avisa
const filtroAtivo = computed(() => filtroSegmento.value !== 'Todos' || filtroNivel.value !== 'Todos' || periodoAtivo.value)

const segmentos = computed(() => {
  return [...new Set(
    clientes.value.map(cliente => cliente.segmento).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'pt-BR'))
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

// Estatística da carteira (dispersão, histograma e boxplot). Mesma regra do
// resto da tela: sem filtro, usa o que o Python calculou (bloco "graficos"
// do JSON, quando existir); com filtro, calcula com os clientes filtrados.
const graficosPython = computed(() => estatisticas.value?.graficos ?? null)

const pontosDispersaoTela = computed(() =>
  graficosPython.value?.dispersao ?? pontosDispersao(clientesFiltrados.value))

const correlacaoTela = computed(() => {
  const doPython = estatisticas.value?.correlacao
  return doPython && doPython.pearson !== null && doPython.pearson !== undefined
    ? doPython
    : correlacaoPearson(pontosDispersaoTela.value)
})

const faixasHistogramaTela = computed(() =>
  graficosPython.value?.histograma ?? faixasHistograma(clientesFiltrados.value))

const boxplotTela = computed(() =>
  graficosPython.value?.boxplot ?? resumoBoxplot(clientesFiltrados.value))

// "Top 10 clientes por faturamento" (a lista completa fica na tela Clientes)
const top10Clientes = computed(() => [...clientesFiltrados.value]
  .sort((a, b) => (Number(b.faturamento) || 0) - (Number(a.faturamento) || 0))
  .slice(0, 10))

const totalClientes = computed(() => {
  return estatisticas.value?.resumo.totalClientes ?? clientesFiltrados.value.length
})

// Total de serviços contratados na base filtrada: cada cliente pode ter
// vários serviços na mesma linha (lista "servicos"). Bases salvas antes
// dessa lista existir só têm o texto "servico", contado como 1.
const totalServicos = computed(() => {
  if (estatisticas.value) {
    return estatisticas.value.porServico.reduce((total, item) => total + item.contratos, 0)
  }
  return clientesFiltrados.value.reduce(
    (total, cliente) => total + (cliente.servicos?.length ?? (cliente.servico ? 1 : 0)),
    0
  )
})

// Este modelo de aula não exige faturamento (o exemplo da professora só
// trata consultor/segmento/nivel_cliente) — clientes sem essa coluna
// preenchida entram como 0, em vez de quebrar a soma com NaN.
const faturamentoTotal = computed(() => {
  if (estatisticas.value) return estatisticas.value.resumo.faturamentoTotal
  return clientesFiltrados.value.reduce(
    (total, cliente) => total + (cliente.faturamento || 0),
    0
  )
})

const ticketMedio = computed(() => {
  if (estatisticas.value) return estatisticas.value.resumo.media ?? 0
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
  if (estatisticas.value) {
    return estatisticas.value.porMes.map(({ mes, clientes }) => ({
      periodo: mes, label: formatarPeriodo(mes), contratos: clientes
    }))
  }
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

        backgroundColor: '#FF8F00',

        borderRadius: 4,

        maxBarThickness: 28
      }
    ]
  }
})

// Barras, e não linha: são contagens inteiras por mês (0, 1, 2...), e uma
// curva suavizada sugeriria valores intermediários que não existem
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
      grace: '15%',
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
  if (estatisticas.value) {
    const valores = new Map(estatisticas.value.porSegmento.map(item => [item.segmento, item.faturamentoTotal]))
    return segmentos.value.map(segmento => valores.get(segmento) ?? 0)
  }
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
  if (estatisticas.value) {
    return niveis.map(nivel => estatisticas.value.porNivel.find(item => item.nivel === nivel)?.clientes ?? 0)
  }

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
    acumulado += estatisticas.value
      ? estatisticas.value.porNivel.find(item => item.nivel === nivel)?.faturamentoTotal ?? 0
      : clientesFiltrados.value
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

        yAxisID: 'y',

        // Desenhada antes (order maior): a linha fica na frente das barras
        order: 2
      },
      {
        type: 'line',

        label: 'Faturamento acumulado (curva ABC)',

        data: faturamentoAcumuladoPorNivel.value,

        borderColor: '#292A2F',

        backgroundColor: '#292A2F',

        borderWidth: 2,

        tension: 0,

        pointRadius: 5,

        pointHoverRadius: 7,

        fill: false,

        yAxisID: 'y1',

        order: 1
      }
    ]
  }
})

const graficoNivelOptions = {
  responsive: true,

  maintainAspectRatio: false,

  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        usePointStyle: true,
        // A legenda das barras usa o azul do nível A como amostra
        generateLabels: chart => chart.data.datasets.map((dataset, indice) => ({
          text: dataset.type === 'line' ? dataset.label : 'Clientes no nível',
          fillStyle: dataset.type === 'line' ? '#292A2F' : '#006EB7',
          strokeStyle: dataset.type === 'line' ? '#292A2F' : '#006EB7',
          pointStyle: dataset.type === 'line' ? 'line' : 'rect',
          datasetIndex: indice
        }))
      }
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
      // Folga no topo: a barra mais alta não encosta na borda do gráfico
      grace: '15%',
      title: {
        display: true,
        text: 'Clientes'
      },
      ticks: {
        stepSize: 1
      }
    },

    y1: {
      position: 'right',
      min: 0,
      max: 110,
      title: {
        display: true,
        text: 'Faturamento acumulado'
      },
      grid: {
        drawOnChartArea: false
      },
      ticks: {
        stepSize: 20,
        callback: valor => (valor <= 100 ? `${valor}%` : '')
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

  if (estatisticas.value?.porServico.every(item => item.faturamentoRateado !== undefined)) {
    estatisticas.value.porServico.forEach(item => {
      faturamentoPorServico[item.servico] = item.faturamentoRateado
    })
  } else {
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
  }

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

const upsell = computed(() => {
  if (USAR_MOCK) return analisarUpsell(clientes.value, clientesFiltrados.value)

  const salvo = dashboard.value?.estatisticas.upsell
  const codigos = new Set(clientesFiltrados.value.map(cliente => cliente.codigo_cliente))
  return {
    segmentoPotencial: salvo?.segmentoPotencial ?? null,
    // O Python devolve { codigo, nome, consultor, segmento, faturamento,
    // motivos }; a tabela usa o mesmo formato do modo mock: { cliente, motivos }
    oportunidades: (salvo?.oportunidades ?? [])
      .filter(item => codigos.has(item.codigo))
      .map(item => ({
        cliente: {
          codigo_cliente: item.codigo,
          nome_cliente: item.nome,
          consultor: item.consultor,
          segmento: item.segmento,
          faturamento: item.faturamento
        },
        motivos: item.motivos ?? []
      }))
  }
})

const MAX_OPORTUNIDADES = 10

const oportunidadesVisiveis = computed(() => upsell.value.oportunidades.slice(0, MAX_OPORTUNIDADES))

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

  return (upsell.value.oportunidades.length / totalClientes.value) * 100
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
  if (!USAR_MOCK) {
    return (dashboard.value?.insights ?? []).map(descricao => ({ descricao }))
  }
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
        : upsell.value.oportunidades.length
          ? `${contar(upsell.value.oportunidades.length, 'cliente', 'clientes')} (${percentualOportunidade.value.toFixed(0)}% da seleção) com potencial para novos serviços.`
          : 'Nenhum cliente com potencial identificado nesta seleção.'
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

// Exporta a base filtrada (mesmos filtros da tela) como CSV
const exportarCSV = () => exportarClientesCsv(clientesFiltrados.value)
</script>

<template>

  <div class="flex min-h-screen flex-col sm:flex-row">

    <Sidebar class="no-print" />

    <div class="grid-background min-w-0 flex-1">

    <!-- CONTEÚDO -->

    <main class="mx-auto max-w-7xl px-6 py-10">
      <p v-if="erroDashboard" role="alert" class="text-sm text-red-700">{{ erroDashboard }}</p>

      <!-- TÍTULO -->

      <div class="flex flex-wrap items-start justify-between gap-4">

        <div>

          <h1 class="text-3xl font-bold text-[#292A2F]">
            Dashboard Executivo
          </h1>

          <p class="mt-2 text-sm text-gray-500">
            Faturamento, clientes e oportunidades da carteira, calculados a partir da última planilha importada.
          </p>

          <p v-if="origemDosDados" class="mt-1 text-xs font-medium text-gray-500">
            {{ origemDosDados }}
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
          {{ auth.pode('importarPlanilha')
            ? 'Importe a base de clientes para ver faturamento, distribuição por nível e insights de oportunidade.'
            : 'Peça a um Consultor para importar a base de clientes. Depois disso, o faturamento, a distribuição por nível e os insights aparecem aqui.' }}
        </p>

        <RouterLink
          v-if="auth.pode('importarPlanilha')"
          to="/upload"
          class="mt-6 inline-block rounded-md bg-[#006EB7] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#03558c]"
        >
          Importar planilha
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

        <CardIndicador titulo="Faturamento Total" :valor="formatarMoedaInteira(faturamentoTotal)" />
        <CardIndicador titulo="Clientes na base" :valor="totalClientes" />
        <CardIndicador titulo="Serviços Contratados" :valor="totalServicos" />
        <CardIndicador titulo="Ticket Médio" :valor="formatarMoedaInteira(ticketMedio)" />

      </div>


      <!-- GRÁFICOS: grade 2x2, igual ao Figma
           (Faturamento por segmento / Evolução das contratações /
           Distribuição por nível A/B/C / Top 5 Serviços por Faturamento) -->

      <div class="grid grid-cols-1 gap-5 @xl:grid-cols-2">

        <!-- GRÁFICO DE ROSCA: SEGMENTO -->

        <!-- @container: a legenda vai para o lado só quando o PRÓPRIO cartão
             é largo; em tablet/celular fica embaixo, sem cortar os nomes -->
        <section class="@container flex flex-col rounded-lg border border-gray-200 bg-white p-6">

          <h2 class="text-lg font-bold text-[#292A2F]">
            Faturamento por segmento
          </h2>

          <div class="mt-5 flex flex-1 flex-col items-center gap-6 @md:flex-row">

            <div class="relative h-44 w-44 flex-shrink-0">

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

            <div class="w-full min-w-0 flex-1 space-y-2.5">

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

        </section>


        <!-- GRÁFICO DE BARRAS: EVOLUÇÃO DAS CONTRATAÇÕES -->

        <section class="rounded-lg border border-gray-200 bg-white p-6">

          <h2 class="text-lg font-bold text-[#292A2F]">
            Evolução das contratações
          </h2>

          <p class="mt-1 text-sm text-gray-500 @xl:@max-3xl:hidden">
            Contratos fechados por mês, pela data de contratação, na base selecionada.
          </p>

          <div class="mt-5 h-80 @xl:@max-3xl:h-56">

            <Bar
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

        </section>


        <!-- GRÁFICO DE NÍVEL A/B/C -->

        <section class="rounded-lg border border-gray-200 bg-white p-6">

          <h2 class="text-lg font-bold text-[#292A2F]">
            Distribuição por nível A/B/C
          </h2>

          <p class="mt-1 text-sm text-gray-500 @xl:@max-3xl:hidden">
            Barras: clientes em cada nível. Linha: quanto do faturamento os níveis somam (curva ABC).
          </p>

          <div class="mt-5 h-80 @xl:@max-3xl:h-56">

            <Bar
              :data="graficoNivelData"
              :options="graficoNivelOptions"
            />

          </div>

        </section>


        <!-- TOP 5 SERVIÇOS POR FATURAMENTO -->

        <section class="rounded-lg border border-gray-200 bg-white p-6">

          <h2 class="text-lg font-bold text-[#292A2F]">
            Top 5 serviços por faturamento
          </h2>

          <p class="mt-1 text-sm text-gray-500 @xl:@max-3xl:hidden">
            Serviços que mais faturam na base selecionada.
          </p>

          <p class="mt-1 text-xs text-gray-500">
            Cliente com mais de um serviço: faturamento dividido em partes iguais entre eles (estimativa).
          </p>

          <div class="mt-5 max-h-80 overflow-y-auto @xl:@max-3xl:max-h-64">

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

        </section>

      </div>


      <!-- ESTATÍSTICA DA CARTEIRA: dispersão, histograma e boxplot.
           Sem filtro: números do Python (estatisticas.graficos), quando ele
           manda; com filtro, ou sem esse bloco: calculados aqui
           (utils/estatistica.js), com o mesmo método. -->

      <section aria-labelledby="titulo-estatistica" class="space-y-5">

        <div>
          <h2 id="titulo-estatistica" class="text-lg font-bold text-[#292A2F]">
            Estatística da carteira
          </h2>
          <p class="mt-1 text-sm text-gray-500">
            Como o faturamento se distribui entre os clientes da base selecionada.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-5 @xl:grid-cols-2">
          <GraficoDispersao :pontos="pontosDispersaoTela" :correlacao="correlacaoTela" />
          <GraficoHistograma :faixas="faixasHistogramaTela" />
        </div>

        <GraficoBoxplot :resumo="boxplotTela" />

      </section>

      </div>


      <!-- INSIGHTS INTELIGENTES -->

      <section class="rounded-lg border border-gray-200 bg-white p-6">

        <h2 class="text-lg font-bold text-[#292A2F]">
          Insights Inteligentes
        </h2>

        <p
          v-if="filtroAtivo && !USAR_MOCK"
          role="note"
          class="mt-3 rounded-md border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-[#03558c]"
        >
          Estes insights e o segmento com potencial são da <strong>carteira inteira</strong>: os filtros
          não se aplicam a eles. Os indicadores, os gráficos e a lista de oportunidades acompanham os filtros.
        </p>

        <div class="mt-5 grid grid-cols-1 gap-3 @2xl:grid-cols-2 @5xl:grid-cols-4">

          <div
            v-for="insight in insights"
            :key="insight.titulo || insight.descricao"
            class="flex gap-3 rounded-lg bg-white p-4 shadow-md shadow-gray-200/60 ring-1 ring-gray-100"
          >

            <span class="w-1.5 flex-shrink-0 rounded-full bg-[#FF8F00]"></span>

            <div class="min-w-0">

              <p v-if="insight.titulo" class="text-sm font-bold text-[#006EB7]">
                {{ insight.titulo }}
              </p>

              <p class="mt-1 text-sm text-gray-500">
                {{ insight.descricao }}
              </p>

            </div>

          </div>

        </div>

        <!-- OPORTUNIDADES DE UPSELL: regras em utils/upsell.js -->

        <div
          v-if="upsell.segmentoPotencial || upsell.oportunidades.length"
          class="mt-6 border-t border-gray-100 pt-5"
        >

          <h3 class="text-sm font-bold text-[#292A2F]">
            Oportunidades de upsell
          </h3>

          <p
            v-if="upsell.segmentoPotencial"
            class="mt-1 text-sm text-gray-500"
          >
            Na empresa, <span class="font-semibold text-[#292A2F]">{{ upsell.segmentoPotencial.segmento }}</span>
            tem {{ upsell.segmentoPotencial.participacaoServicos.toFixed(0) }}% dos serviços contratados,
            mas só {{ upsell.segmentoPotencial.participacaoFaturamento.toFixed(0) }}% do faturamento.
          </p>

          <div
            v-if="upsell.oportunidades.length"
            class="mt-4 overflow-x-auto"
          >

            <table class="w-full min-w-[760px] text-left text-sm">

              <caption class="sr-only">Clientes com potencial de upsell, do maior para o menor faturamento</caption>

              <thead class="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th scope="col" class="px-4 py-3 font-semibold">Cliente</th>
                  <th scope="col" class="px-4 py-3 font-semibold">Consultor</th>
                  <th scope="col" class="px-4 py-3 font-semibold">Segmento</th>
                  <th scope="col" class="px-4 py-3 text-right font-semibold">Faturamento</th>
                  <th scope="col" class="px-4 py-3 font-semibold">Por que é uma oportunidade</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="{ cliente, motivos } in oportunidadesVisiveis"
                  :key="cliente.codigo_cliente"
                  class="border-t border-gray-100 align-top"
                >
                  <th scope="row" class="px-4 py-3 font-medium text-[#292A2F]">{{ cliente.nome_cliente }}</th>
                  <td class="px-4 py-3 text-gray-600">{{ cliente.consultor }}</td>
                  <td class="px-4 py-3 text-gray-600">{{ cliente.segmento }}</td>
                  <td class="whitespace-nowrap px-4 py-3 text-right text-gray-600">{{ formatarMoedaInteira(cliente.faturamento || 0) }}</td>
                  <td class="px-4 py-3 text-xs text-gray-600">
                    <p v-for="motivo in motivos" :key="motivo">{{ motivo }}</p>
                  </td>
                </tr>
              </tbody>

            </table>

          </div>

          <p
            v-if="upsell.oportunidades.length > MAX_OPORTUNIDADES"
            class="mt-2 text-xs text-gray-500"
          >
            Mostrando os {{ MAX_OPORTUNIDADES }} de maior faturamento, de {{ upsell.oportunidades.length }} clientes. Use os filtros para ver os demais.
          </p>

        </div>

      </section>

      </div>


      <!-- TOP 10 CLIENTES POR FATURAMENTO (lista completa na tela Clientes) -->

      <section
        v-if="clientesFiltrados.length"
        class="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white"
      >

        <div class="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 p-5">
          <div>
            <h2 class="text-lg font-bold text-[#292A2F]">
              Top 10 clientes por faturamento
            </h2>
            <p class="mt-1 text-sm text-gray-500">
              Os maiores clientes da base selecionada ({{ contar(clientesFiltrados.length, 'cliente', 'clientes') }} no total).
            </p>
          </div>

          <RouterLink
            to="/relatorios"
            class="text-sm font-semibold text-[#006EB7] hover:underline print:hidden"
          >
            Ver todos em Clientes →
          </RouterLink>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="w-10 p-4 text-left font-semibold text-gray-500">#</th>
                <th class="p-4 text-left font-semibold text-gray-500">Cliente</th>
                <th class="p-4 text-left font-semibold text-gray-500">Consultor</th>
                <th class="p-4 text-left font-semibold text-gray-500">Segmento</th>
                <th class="p-4 text-right font-semibold text-gray-500">Faturamento</th>
                <th class="p-4 text-left font-semibold text-gray-500">Nível</th>
                <th class="p-4 text-left font-semibold text-gray-500">Serviços</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(cliente, posicao) in top10Clientes"
                :key="cliente.codigo_cliente || cliente.nome_cliente"
                class="border-t border-gray-200 transition-colors hover:bg-gray-50"
              >
                <td class="p-4 text-gray-400">{{ posicao + 1 }}</td>
                <td class="p-4 font-medium text-[#292A2F]">{{ cliente.nome_cliente }}</td>
                <td class="p-4 text-gray-500">{{ cliente.consultor || '—' }}</td>
                <td class="p-4 text-gray-500">{{ cliente.segmento }}</td>
                <td class="whitespace-nowrap p-4 text-right text-gray-500">
                  {{ cliente.faturamento != null ? formatarMoeda(cliente.faturamento) : '—' }}
                </td>
                <td class="p-4">
                  <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#006EB7]">
                    {{ cliente.nivel_cliente }}
                  </span>
                </td>
                <td class="p-4 text-gray-500">{{ cliente.servico || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </section>

      <!-- FILTROS SEM RESULTADO (base vazia já tem o aviso lá em cima) -->

      <div
        v-else-if="clientes.length"
        class="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center"
      >

        <h2 class="font-bold">
          Nenhum cliente encontrado.
        </h2>

        <p class="mt-2 text-sm text-gray-500">
          Nenhum cliente corresponde aos filtros escolhidos. Altere os filtros.
        </p>

      </div>

    </main>

    </div>

  </div>

</template>