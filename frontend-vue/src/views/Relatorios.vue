<script setup>
import { lerDashboard, USAR_MOCK } from '../services/api'
import { computed, onMounted, ref, watch } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import AppToast from '../components/AppToast.vue'
import FormularioCliente from '../components/FormularioCliente.vue'
import { useAuthStore } from '../stores/authStore'
import { useClientesStore } from '../stores/clientesStore'
import { useUploadStore } from '../stores/uploadStore'
import { dentroDoPeriodo, periodoInvertido } from '../utils/periodo'
import { exportarClientesCsv } from '../utils/exportarCsv'
import { analisarUpsell } from '../utils/upsell'

// Tela Clientes (rota /relatorios): a carteira atual com busca, filtros,
// ordenação, exportação e manutenção (incluir, editar e excluir).

const auth = useAuthStore()

// Base de clientes: vem do clientesStore (a mesma do Dashboard e da importação)
const clientesStore = useClientesStore()
const clientes = computed(() => clientesStore.lista)

// ---------- Oportunidades de upsell (selo na tabela) ----------

// codigo_cliente -> motivos. Na API vem do resultado do Python (o mesmo do
// Dashboard); no modo simulado, das regras de utils/upsell.js.
const upsellPorCodigo = ref(new Map())

const carregarUpsell = async () => {
  try {
    if (USAR_MOCK) {
      const { oportunidades } = analisarUpsell(clientes.value, clientes.value)
      upsellPorCodigo.value = new Map(oportunidades.map(({ cliente, motivos }) => [cliente.codigo_cliente, motivos]))
      return
    }

    const dashboard = await lerDashboard()
    const oportunidades = dashboard?.estatisticas?.upsell?.oportunidades ?? []
    upsellPorCodigo.value = new Map(oportunidades.map(item => [item.codigo, item.motivos ?? []]))
  } catch {
    // Sem o selo a tela continua funcionando
    upsellPorCodigo.value = new Map()
  }
}

const motivosUpsell = cliente => upsellPorCodigo.value.get(cliente.codigo_cliente)

onMounted(async () => {
  await clientesStore.carregar()
  await carregarUpsell()
})

// ---------- Busca e filtros ----------

const busca = ref('')
const filtroSegmento = ref('')
const filtroNivel = ref('')
const filtroConsultor = ref('')

// Período (data de contratação), como "aaaa-mm-dd"; vazio = sem limite.
const dataInicio = ref('')
const dataFim = ref('')

const periodoImpossivel = computed(() => periodoInvertido(dataInicio.value, dataFim.value))

const filtrosAtivos = computed(() => Boolean(
  busca.value.trim() || filtroSegmento.value || filtroNivel.value || filtroConsultor.value || dataInicio.value || dataFim.value
))

const limparFiltros = () => {
  busca.value = ''
  filtroSegmento.value = ''
  filtroNivel.value = ''
  filtroConsultor.value = ''
  dataInicio.value = ''
  dataFim.value = ''
}

// Opções dos filtros: só o que existe na carteira atual
const opcoes = campo => [...new Set(clientes.value.map(cliente => cliente[campo]).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, 'pt-BR'))
const segmentos = computed(() => opcoes('segmento'))
const consultores = computed(() => opcoes('consultor'))

// Sem acento e minúsculo: "industria" acha "Indústria", "ana" acha "ANA"
const normalizar = texto => String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const clientesFiltrados = computed(() => {
  const termo = normalizar(busca.value.trim())

  return clientes.value.filter(cliente => {
    const textoBusca = !termo || [cliente.nome_cliente, cliente.codigo_cliente, cliente.consultor]
      .some(valor => normalizar(valor).includes(termo))

    return textoBusca &&
      (!filtroSegmento.value || cliente.segmento === filtroSegmento.value) &&
      (!filtroNivel.value || cliente.nivel_cliente === filtroNivel.value) &&
      (!filtroConsultor.value || cliente.consultor === filtroConsultor.value) &&
      dentroDoPeriodo(cliente, dataInicio.value, dataFim.value)
  })
})

// ---------- Ordenação (clique no cabeçalho) ----------

const COLUNAS_ORDENAVEIS = {
  nome_cliente: { rotulo: 'Empresa', primeiraDirecao: 'asc' },
  faturamento: { rotulo: 'Faturamento', primeiraDirecao: 'desc' },
  nivel_cliente: { rotulo: 'Nível', primeiraDirecao: 'asc' },
  data_contratacao: { rotulo: 'Data da contratação', primeiraDirecao: 'desc' }
}

const ordem = ref({ campo: 'nome_cliente', direcao: 'asc' })

const ordenarPor = campo => {
  ordem.value = ordem.value.campo === campo
    ? { campo, direcao: ordem.value.direcao === 'asc' ? 'desc' : 'asc' }
    : { campo, direcao: COLUNAS_ORDENAVEIS[campo].primeiraDirecao }
}

// Celular: a ordem vem de uma lista ("faturamento:desc")
const ordenarPelaLista = valor => {
  const [campo, direcao] = valor.split(':')
  ordem.value = { campo, direcao }
}

const ariaSort = campo => {
  if (ordem.value.campo !== campo) return 'none'
  return ordem.value.direcao === 'asc' ? 'ascending' : 'descending'
}

const setaOrdem = campo => {
  if (ordem.value.campo !== campo) return '↕'
  return ordem.value.direcao === 'asc' ? '↑' : '↓'
}

const clientesOrdenados = computed(() => {
  const { campo, direcao } = ordem.value
  const sinal = direcao === 'asc' ? 1 : -1

  return [...clientesFiltrados.value].sort((a, b) => {
    const x = a[campo]
    const y = b[campo]
    if (x == null && y == null) return 0
    if (x == null) return 1
    if (y == null) return -1
    const comparacao = typeof x === 'number' && typeof y === 'number'
      ? x - y
      : String(x).localeCompare(String(y), 'pt-BR')
    return comparacao * sinal
  })
})

// ---------- Resumo da lista filtrada ----------

const faturamentoFiltrado = computed(() => clientesFiltrados.value
  .reduce((total, cliente) => total + (Number(cliente.faturamento) || 0), 0))

const comUpsell = computed(() => clientesFiltrados.value.filter(cliente => motivosUpsell(cliente)).length)

const formatarCompacto = valor => valor.toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1
})

// ---------- Paginação ----------

const ITENS_POR_PAGINA = 10
const paginaAtual = ref(1)

const totalPaginas = computed(() => Math.max(1, Math.ceil(clientesOrdenados.value.length / ITENS_POR_PAGINA)))

const clientesPaginados = computed(() => {
  const inicio = (paginaAtual.value - 1) * ITENS_POR_PAGINA
  return clientesOrdenados.value.slice(inicio, inicio + ITENS_POR_PAGINA)
})

// Mudou busca, filtro ou ordem: volta para a primeira página
watch([busca, filtroSegmento, filtroNivel, filtroConsultor, dataInicio, dataFim, ordem], () => {
  paginaAtual.value = 1
})

const paginaAnterior = () => {
  if (paginaAtual.value > 1) paginaAtual.value--
}

const proximaPagina = () => {
  if (paginaAtual.value < totalPaginas.value) paginaAtual.value++
}

// ---------- Formatação ----------

const formatarMoeda = valor => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatarData = valor => {
  if (!valor) return '—'
  const [ano, mes, dia] = valor.split('-')
  return `${dia}/${mes}/${ano}`
}

// ---------- Inclusão, edição e exclusão de clientes ----------

const formularioAberto = ref(false)
const clienteEmEdicao = ref(null)
const aviso = ref({ mensagem: '', tipo: 'sucesso' })
const excluindo = ref(null)

const podeEditar = computed(() => auth.pode('editarCliente'))
const podeExcluir = computed(() => auth.pode('excluirCliente'))
const mostrarAcoes = computed(() => podeEditar.value || podeExcluir.value)

const abrirFormulario = (cliente = null) => {
  clienteEmEdicao.value = cliente
  formularioAberto.value = true
}

// Depois de salvar ou excluir, o Python recalcula tudo: atualiza o selo
const aoSalvar = async mensagem => {
  formularioAberto.value = false
  aviso.value = { mensagem, tipo: 'sucesso' }
  await carregarUpsell()
}

const confirmarExclusao = async cliente => {
  const confirmou = window.confirm(
    `Excluir ${cliente.nome_cliente} (${cliente.codigo_cliente}) da carteira? Os indicadores do Dashboard serão recalculados sem esse cliente.`
  )
  if (!confirmou) return

  excluindo.value = cliente.codigo_cliente
  try {
    await clientesStore.excluirCliente(cliente)
    aviso.value = { mensagem: `${cliente.nome_cliente} foi excluído da carteira.`, tipo: 'sucesso' }
    await carregarUpsell()
  } catch (falha) {
    aviso.value = { mensagem: falha.message || 'Não foi possível excluir. Tente novamente.', tipo: 'erro' }
  } finally {
    excluindo.value = null
  }
}

// Só no modo simulado: zera o localStorage DESTE navegador (clientes e
// histórico). Com o back-end ligado, a exclusão é por cliente.
const limparDados = async () => {
  const confirmou = window.confirm(
    'Isso vai apagar os clientes e o histórico salvos neste navegador (dados de teste do modo simulado). Não tem como desfazer. Confirma?'
  )
  if (!confirmou) return
  await useUploadStore().limparDados()
}

const classeCampo = 'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-cti-azul'
</script>

<template>

  <div class="flex min-h-screen flex-col sm:flex-row">

    <Sidebar />

    <div class="grid-background min-w-0 flex-1">

      <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">

        <!-- TÍTULO + AÇÃO PRINCIPAL -->

        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-3xl font-bold text-cti-grafite">
              Clientes
            </h1>
            <p class="mt-2 text-sm text-gray-500">
              A carteira atual: encontre clientes, veja quem tem oportunidade de upsell e mantenha os dados em dia.
            </p>
          </div>

          <button
            v-if="podeEditar"
            type="button"
            @click="abrirFormulario()"
            class="rounded-md bg-cti-azul px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cti-azul-escuro"
          >
            + Novo cliente
          </button>
        </div>

        <!-- BUSCA E FILTROS -->

        <div class="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label class="text-xs font-semibold text-gray-500 sm:col-span-2">
              Buscar
              <input
                v-model="busca"
                type="search"
                placeholder="Empresa, código ou consultor"
                :class="[classeCampo, 'mt-1 w-full']"
              />
            </label>

            <label class="text-xs font-semibold text-gray-500">
              Segmento
              <select v-model="filtroSegmento" :class="[classeCampo, 'mt-1 w-full']">
                <option value="">Todos</option>
                <option v-for="segmento in segmentos" :key="segmento" :value="segmento">{{ segmento }}</option>
              </select>
            </label>

            <label class="text-xs font-semibold text-gray-500">
              Nível
              <select v-model="filtroNivel" :class="[classeCampo, 'mt-1 w-full']">
                <option value="">Todos</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </label>

            <label class="text-xs font-semibold text-gray-500 sm:col-span-2">
              Consultor
              <select v-model="filtroConsultor" :class="[classeCampo, 'mt-1 w-full']">
                <option value="">Todos</option>
                <option v-for="consultor in consultores" :key="consultor" :value="consultor">{{ consultor }}</option>
              </select>
            </label>

            <label class="text-xs font-semibold text-gray-500">
              Contratação de
              <input v-model="dataInicio" type="date" :class="[classeCampo, 'mt-1 w-full']" />
            </label>

            <label class="text-xs font-semibold text-gray-500">
              até
              <input v-model="dataFim" type="date" :class="[classeCampo, 'mt-1 w-full']" />
            </label>
          </div>

          <div class="mt-3 flex flex-wrap items-center justify-end gap-3">
            <button
              v-if="filtrosAtivos"
              type="button"
              @click="limparFiltros"
              class="text-sm font-medium text-cti-azul transition hover:underline"
            >
              Limpar filtros
            </button>

            <button
              v-if="clientes.length && USAR_MOCK && auth.pode('limparDados')"
              type="button"
              @click="limparDados"
              class="text-sm font-medium text-red-500 transition hover:text-red-600"
            >
              Limpar dados locais deste navegador
            </button>

            <button
              v-if="clientesOrdenados.length"
              type="button"
              @click="exportarClientesCsv(clientesOrdenados)"
              class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-cti-azul hover:text-cti-azul"
              title="Baixa os clientes desta lista (com a busca, os filtros e a ordem aplicados) para abrir no Excel"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        <p
          v-if="periodoImpossivel"
          class="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          A data inicial é posterior à data final — nenhum cliente pode aparecer nesse período.
        </p>

        <!-- LISTA -->

        <section
          v-if="clientesOrdenados.length"
          aria-labelledby="carteira-titulo"
          class="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white"
        >

          <div class="border-b border-gray-200 p-5">
            <h2 id="carteira-titulo" class="text-lg font-bold text-cti-grafite">
              Carteira atual
            </h2>

            <!-- Resumo do que está na tela (respeita busca e filtros) -->
            <p class="mt-1 text-sm text-gray-600" role="status">
              <span class="font-semibold text-cti-grafite">{{ clientesFiltrados.length }} de {{ clientes.length }} clientes</span>
              · {{ formatarCompacto(faturamentoFiltrado) }} em faturamento
              <template v-if="comUpsell">
                · <span class="font-semibold text-cti-laranja-texto">{{ comUpsell }} com oportunidade de upsell</span>
              </template>
            </p>
          </div>

          <!-- Computador: tabela com cabeçalhos que ordenam -->
          <div class="hidden overflow-x-auto md:block">
            <table class="w-full min-w-[900px] text-left text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="p-4 font-semibold text-gray-500">Código</th>

                  <th class="p-4 font-semibold text-gray-500" :aria-sort="ariaSort('nome_cliente')">
                    <button type="button" class="inline-flex items-center gap-1 hover:text-cti-azul" @click="ordenarPor('nome_cliente')">
                      Empresa
                      <span aria-hidden="true" :class="ordem.campo === 'nome_cliente' ? 'text-cti-azul' : 'text-gray-300'">{{ setaOrdem('nome_cliente') }}</span>
                    </button>
                  </th>

                  <th class="p-4 font-semibold text-gray-500">Consultor</th>
                  <th class="p-4 font-semibold text-gray-500">Segmento</th>

                  <th
                    v-for="campo in ['faturamento', 'nivel_cliente']"
                    :key="campo"
                    class="p-4 font-semibold text-gray-500"
                    :aria-sort="ariaSort(campo)"
                  >
                    <button type="button" class="inline-flex items-center gap-1 hover:text-cti-azul" @click="ordenarPor(campo)">
                      {{ COLUNAS_ORDENAVEIS[campo].rotulo }}
                      <span aria-hidden="true" :class="ordem.campo === campo ? 'text-cti-azul' : 'text-gray-300'">{{ setaOrdem(campo) }}</span>
                    </button>
                  </th>

                  <th class="p-4 font-semibold text-gray-500">Serviços</th>

                  <th class="p-4 font-semibold text-gray-500" :aria-sort="ariaSort('data_contratacao')">
                    <button type="button" class="inline-flex items-center gap-1 text-left hover:text-cti-azul" @click="ordenarPor('data_contratacao')">
                      {{ COLUNAS_ORDENAVEIS.data_contratacao.rotulo }}
                      <span aria-hidden="true" :class="ordem.campo === 'data_contratacao' ? 'text-cti-azul' : 'text-gray-300'">{{ setaOrdem('data_contratacao') }}</span>
                    </button>
                  </th>

                  <th v-if="mostrarAcoes" class="p-4 text-right font-semibold text-gray-500">Ações</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(cliente, indice) in clientesPaginados"
                  :key="cliente.codigo_cliente || `${cliente.nome_cliente}-${indice}`"
                  class="border-t border-gray-200 align-top transition-colors hover:bg-gray-50"
                >
                  <td class="p-4 text-gray-500">{{ cliente.codigo_cliente || '—' }}</td>

                  <td class="p-4 font-medium text-cti-grafite">
                    {{ cliente.nome_cliente }}
                    <span
                      v-if="motivosUpsell(cliente)"
                      class="ml-1 inline-block cursor-help rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cti-laranja-texto"
                      :title="motivosUpsell(cliente).join(' · ')"
                      :aria-label="`Oportunidade de upsell: ${motivosUpsell(cliente).join('; ')}`"
                    >Upsell</span>
                  </td>

                  <td class="p-4 text-gray-500">{{ cliente.consultor || '—' }}</td>
                  <td class="p-4 text-gray-500">{{ cliente.segmento }}</td>
                  <td class="whitespace-nowrap p-4 text-gray-500">{{ cliente.faturamento != null ? formatarMoeda(cliente.faturamento) : '—' }}</td>

                  <td class="p-4">
                    <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-cti-azul">{{ cliente.nivel_cliente }}</span>
                  </td>

                  <td class="p-4 text-gray-500">{{ cliente.servico || '—' }}</td>
                  <td class="p-4 text-gray-500">{{ formatarData(cliente.data_contratacao) }}</td>

                  <td v-if="mostrarAcoes" class="whitespace-nowrap p-4 text-right">
                    <button
                      v-if="podeEditar"
                      type="button"
                      :aria-label="`Editar ${cliente.nome_cliente}`"
                      class="rounded px-2 py-1 text-sm font-semibold text-cti-azul transition hover:bg-blue-50"
                      @click="abrirFormulario(cliente)"
                    >
                      Editar
                    </button>
                    <button
                      v-if="podeExcluir"
                      type="button"
                      :disabled="excluindo === cliente.codigo_cliente"
                      :aria-label="`Excluir ${cliente.nome_cliente}`"
                      class="ml-1 rounded px-2 py-1 text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                      @click="confirmarExclusao(cliente)"
                    >
                      {{ excluindo === cliente.codigo_cliente ? 'Excluindo...' : 'Excluir' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Celular e tablet: um cartão por cliente, ações sempre visíveis -->
          <div class="md:hidden">
            <label class="flex items-center gap-2 border-b border-gray-100 px-5 py-3 text-xs font-semibold text-gray-500">
              Ordenar por
              <select
                :value="`${ordem.campo}:${ordem.direcao}`"
                class="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm font-normal text-gray-700"
                @change="ordenarPelaLista($event.target.value)"
              >
                <option value="nome_cliente:asc">Empresa (A–Z)</option>
                <option value="faturamento:desc">Maior faturamento</option>
                <option value="faturamento:asc">Menor faturamento</option>
                <option value="nivel_cliente:asc">Nível (A → C)</option>
                <option value="data_contratacao:desc">Contratação mais recente</option>
                <option value="data_contratacao:asc">Contratação mais antiga</option>
              </select>
            </label>

            <ul class="divide-y divide-gray-100">
              <li
                v-for="(cliente, indice) in clientesPaginados"
                :key="cliente.codigo_cliente || `${cliente.nome_cliente}-${indice}`"
                class="px-5 py-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-semibold text-cti-grafite">
                      {{ cliente.nome_cliente }}
                      <span
                        v-if="motivosUpsell(cliente)"
                        class="ml-1 inline-block rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cti-laranja-texto"
                      >Upsell</span>
                    </p>
                    <p class="mt-0.5 text-xs text-gray-500">
                      {{ cliente.codigo_cliente }} · {{ cliente.segmento }} · {{ cliente.consultor || '—' }}
                    </p>
                  </div>
                  <span class="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-cti-azul">{{ cliente.nivel_cliente }}</span>
                </div>

                <p class="mt-2 text-sm font-semibold text-cti-grafite">
                  {{ cliente.faturamento != null ? formatarMoeda(cliente.faturamento) : '—' }}
                  <span class="font-normal text-gray-500">· desde {{ formatarData(cliente.data_contratacao) }}</span>
                </p>
                <p class="mt-1 text-xs text-gray-500">{{ cliente.servico || '—' }}</p>
                <p v-if="motivosUpsell(cliente)" class="mt-1 text-xs text-cti-laranja-texto">{{ motivosUpsell(cliente)[0] }}</p>

                <div v-if="mostrarAcoes" class="mt-3 flex gap-2">
                  <button
                    v-if="podeEditar"
                    type="button"
                    :aria-label="`Editar ${cliente.nome_cliente}`"
                    class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-cti-azul"
                    @click="abrirFormulario(cliente)"
                  >
                    Editar
                  </button>
                  <button
                    v-if="podeExcluir"
                    type="button"
                    :disabled="excluindo === cliente.codigo_cliente"
                    :aria-label="`Excluir ${cliente.nome_cliente}`"
                    class="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-red-500 disabled:opacity-50"
                    @click="confirmarExclusao(cliente)"
                  >
                    {{ excluindo === cliente.codigo_cliente ? 'Excluindo...' : 'Excluir' }}
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <div
            v-if="totalPaginas > 1"
            class="flex items-center justify-between border-t border-gray-200 px-5 py-4"
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

        </section>

        <!-- NADA PARA MOSTRAR -->

        <div
          v-else
          class="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center"
        >
          <h2 class="font-bold text-cti-grafite">
            {{ clientes.length ? 'Nenhum cliente com esses filtros.' : 'Nenhum cliente na carteira.' }}
          </h2>

          <p class="mt-2 text-sm text-gray-500">
            {{ clientes.length
              ? 'Tente outra busca ou limpe os filtros.'
              : auth.pode('importarPlanilha')
                ? 'Importe uma planilha na tela Importar.'
                : 'Peça a um Consultor para importar a carteira de clientes.' }}
          </p>

          <button
            v-if="clientes.length && filtrosAtivos"
            type="button"
            class="mt-6 rounded-md border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            @click="limparFiltros"
          >
            Limpar filtros
          </button>

          <RouterLink
            v-if="!clientes.length && auth.pode('importarPlanilha')"
            to="/upload"
            class="mt-6 inline-block rounded-md bg-cti-azul px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cti-azul-escuro"
          >
            Importar planilha
          </RouterLink>
        </div>

      </main>

    </div>

    <FormularioCliente
      v-if="formularioAberto"
      :cliente="clienteEmEdicao"
      :consultores="consultores"
      @fechar="formularioAberto = false"
      @salvo="aoSalvar"
    />

    <AppToast
      :mensagem="aviso.mensagem"
      :tipo="aviso.tipo"
      @fechar="aviso.mensagem = ''"
    />

  </div>

</template>
