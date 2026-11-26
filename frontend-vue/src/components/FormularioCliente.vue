<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useClientesStore } from '../stores/clientesStore'
import { SEGMENTOS_VALIDOS, UFS } from '../utils/etl'

// Janela de inclusão/edição de um cliente (tela Relatórios).
// cliente = null → novo cliente; senão, edita o cliente recebido.
// As regras são as mesmas da planilha (e do Spring, que valida de novo).
const props = defineProps({
  cliente: { type: Object, default: null },
  // Consultores que já existem na carteira, para sugerir no campo
  consultores: { type: Array, default: () => [] }
})

const emit = defineEmits(['fechar', 'salvo'])
const clientesStore = useClientesStore()

const editando = computed(() => Boolean(props.cliente))

// Segmento fora da lista (ex.: base antiga) aparece como opção, para não
// sumir do campo; ao salvar, a validação pede um segmento válido.
const opcoesSegmento = computed(() => {
  const atual = props.cliente?.segmento
  return atual && !SEGMENTOS_VALIDOS.includes(atual) ? [atual, ...SEGMENTOS_VALIDOS] : SEGMENTOS_VALIDOS
})

const original = props.cliente
const form = reactive({
  codigo_cliente: original?.codigo_cliente ?? '',
  nome_cliente: original?.nome_cliente ?? '',
  consultor: original?.consultor ?? '',
  segmento: original?.segmento ?? '',
  nivel_cliente: original?.nivel_cliente ?? '',
  faturamento: original?.faturamento ?? '',
  data_contratacao: original?.data_contratacao ?? '',
  servicos: (original?.servicos?.length ? original.servicos : (original?.servico ? original.servico.split(',') : []))
    .map(servico => servico.trim()).filter(Boolean).join('; '),
  cidade: original?.cidade ?? '',
  uf: original?.uf ?? ''
})

const erros = ref({})
const erroServidor = ref('')
const salvando = ref(false)
const primeiroCampo = ref(null)

const listaServicos = () => form.servicos.split(/[;,]/).map(servico => servico.trim()).filter(Boolean)

const validar = () => {
  const novos = {}
  if (!form.codigo_cliente.trim()) novos.codigo_cliente = 'Informe o código do cliente.'
  if (!form.nome_cliente.trim()) novos.nome_cliente = 'Informe o nome da empresa.'
  if (!form.consultor.trim()) novos.consultor = 'Informe o consultor responsável.'
  if (!SEGMENTOS_VALIDOS.includes(form.segmento)) novos.segmento = 'Escolha um segmento da lista.'
  if (!['A', 'B', 'C'].includes(form.nivel_cliente)) novos.nivel_cliente = 'Escolha o nível A, B ou C.'
  if (form.faturamento === '' || Number(form.faturamento) < 0 || Number.isNaN(Number(form.faturamento))) {
    novos.faturamento = 'Informe o faturamento anual em reais (sem valor negativo).'
  }
  if (!form.data_contratacao) novos.data_contratacao = 'Informe a data de contratação.'
  if (!listaServicos().length) novos.servicos = 'Informe ao menos um serviço.'
  erros.value = novos
  return Object.keys(novos).length === 0
}

const salvar = async () => {
  erroServidor.value = ''
  if (!validar() || salvando.value) return

  salvando.value = true
  try {
    await clientesStore.salvarCliente(props.cliente, {
      codigo_cliente: form.codigo_cliente.trim().toUpperCase(),
      nome_cliente: form.nome_cliente.trim(),
      consultor: form.consultor.trim(),
      segmento: form.segmento,
      nivel_cliente: form.nivel_cliente,
      faturamento: Number(form.faturamento),
      data_contratacao: form.data_contratacao,
      servicos: listaServicos(),
      cidade: form.cidade.trim(),
      uf: form.uf
    })
    emit('salvo', editando.value
      ? `${form.nome_cliente.trim()} foi atualizado. Os indicadores foram recalculados.`
      : `${form.nome_cliente.trim()} foi incluído na carteira. Os indicadores foram recalculados.`)
  } catch (falha) {
    erroServidor.value = falha.status === 409
      ? (falha.message || 'Já existe um cliente com este código na carteira.')
      : falha.message || 'Não foi possível salvar. Tente novamente.'
  } finally {
    salvando.value = false
  }
}

const fecharSePuder = () => {
  if (!salvando.value) emit('fechar')
}

const aoPressionarTecla = evento => {
  if (evento.key === 'Escape') fecharSePuder()
}

onMounted(async () => {
  window.addEventListener('keydown', aoPressionarTecla)
  await nextTick()
  primeiroCampo.value?.focus()
})
onUnmounted(() => window.removeEventListener('keydown', aoPressionarTecla))

const classeCampo = campo => [
  'mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#006EB7]',
  erros.value[campo] ? 'border-red-300' : 'border-gray-300'
]
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
    @click.self="fecharSePuder"
  >
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="formulario-cliente-titulo"
      class="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-xl bg-white shadow-xl sm:rounded-xl"
    >
      <header class="border-b border-gray-200 px-6 py-5">
        <h2 id="formulario-cliente-titulo" class="text-lg font-bold text-[#292A2F]">
          {{ editando ? 'Editar cliente' : 'Novo cliente' }}
        </h2>
        <p class="mt-1 text-sm text-gray-500">
          Ao salvar, a carteira é atualizada e o Dashboard recalcula os indicadores.
        </p>
      </header>

      <form class="space-y-5 px-6 py-5" novalidate @submit.prevent="salvar">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="text-sm font-medium text-gray-700">
            Código do cliente
            <input ref="primeiroCampo" v-model="form.codigo_cliente" type="text" maxlength="50"
              placeholder="Ex.: CLI-001" :class="classeCampo('codigo_cliente')" />
            <span v-if="erros.codigo_cliente" class="mt-1 block text-xs text-red-600">{{ erros.codigo_cliente }}</span>
          </label>

          <label class="text-sm font-medium text-gray-700">
            Empresa
            <input v-model="form.nome_cliente" type="text" maxlength="200"
              placeholder="Razão social ou nome fantasia" :class="classeCampo('nome_cliente')" />
            <span v-if="erros.nome_cliente" class="mt-1 block text-xs text-red-600">{{ erros.nome_cliente }}</span>
          </label>

          <label class="text-sm font-medium text-gray-700">
            Consultor responsável
            <input v-model="form.consultor" type="text" maxlength="150" list="lista-consultores"
              placeholder="Nome do consultor" :class="classeCampo('consultor')" />
            <datalist id="lista-consultores">
              <option v-for="nome in consultores" :key="nome" :value="nome" />
            </datalist>
            <span v-if="erros.consultor" class="mt-1 block text-xs text-red-600">{{ erros.consultor }}</span>
          </label>

          <label class="text-sm font-medium text-gray-700">
            Segmento
            <select v-model="form.segmento" :class="classeCampo('segmento')">
              <option value="" disabled>Escolha o segmento</option>
              <option v-for="segmento in opcoesSegmento" :key="segmento" :value="segmento">{{ segmento }}</option>
            </select>
            <span v-if="erros.segmento" class="mt-1 block text-xs text-red-600">{{ erros.segmento }}</span>
          </label>

          <label class="text-sm font-medium text-gray-700">
            Nível
            <select v-model="form.nivel_cliente" :class="classeCampo('nivel_cliente')">
              <option value="" disabled>Escolha o nível</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
            <span v-if="erros.nivel_cliente" class="mt-1 block text-xs text-red-600">{{ erros.nivel_cliente }}</span>
          </label>

          <label class="text-sm font-medium text-gray-700">
            Faturamento anual (R$)
            <input v-model="form.faturamento" type="number" min="0" step="0.01" inputmode="decimal"
              placeholder="Ex.: 1850000" :class="classeCampo('faturamento')" />
            <span v-if="erros.faturamento" class="mt-1 block text-xs text-red-600">{{ erros.faturamento }}</span>
          </label>

          <label class="text-sm font-medium text-gray-700">
            Data da contratação
            <input v-model="form.data_contratacao" type="date" :class="classeCampo('data_contratacao')" />
            <span v-if="erros.data_contratacao" class="mt-1 block text-xs text-red-600">{{ erros.data_contratacao }}</span>
          </label>

          <label class="text-sm font-medium text-gray-700">
            Serviços contratados
            <input v-model="form.servicos" type="text" placeholder="Ex.: Firewall; Backup"
              :class="classeCampo('servicos')" />
            <span v-if="erros.servicos" class="mt-1 block text-xs text-red-600">{{ erros.servicos }}</span>
            <span v-else class="mt-1 block text-xs font-normal text-gray-500">Separe vários serviços com ponto e vírgula.</span>
          </label>

          <label class="text-sm font-medium text-gray-700">
            Cidade <span class="font-normal text-gray-400">(opcional)</span>
            <input v-model="form.cidade" type="text" maxlength="100" :class="classeCampo('cidade')" />
          </label>

          <label class="text-sm font-medium text-gray-700">
            UF <span class="font-normal text-gray-400">(opcional)</span>
            <select v-model="form.uf" :class="classeCampo('uf')">
              <option value="">—</option>
              <option v-for="uf in UFS" :key="uf" :value="uf">{{ uf }}</option>
            </select>
          </label>
        </div>

        <p
          v-if="erroServidor"
          role="alert"
          class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {{ erroServidor }}
        </p>

        <div class="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            :disabled="salvando"
            class="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-400 disabled:opacity-50"
            @click="fecharSePuder"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="salvando"
            class="rounded-md bg-[#006EB7] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#03558c] disabled:opacity-60"
          >
            {{ salvando ? 'Salvando e recalculando...' : (editando ? 'Salvar alterações' : 'Incluir cliente') }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
