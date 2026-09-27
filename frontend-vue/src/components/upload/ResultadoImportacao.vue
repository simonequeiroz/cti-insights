<script setup>
import { computed } from 'vue'
import { formatarDataHora } from '../../utils/datas'

// Resultado da base em uso: quantos clientes entraram, o que mudou em
// relação à base anterior e o que o sistema corrigiu sozinho.
const props = defineProps({
  clientes: { type: Array, required: true },
  // Registro do histórico que gerou a base (upload.origemBaseAtual)
  registro: { type: Object, default: null },
  // true quando a base acabou de ser importada nesta tela
  recente: { type: Boolean, default: false }
})

// Só entram como "correção" os campos em que o valor mudou de verdade
// (grafia, maiúscula). Data e faturamento só mudam de formato
// (15/03/2026 → 2026-03-15), então não contam.
const CAMPOS_CORRIGIDOS = {
  segmento: 'Segmento',
  consultor: 'Consultor',
  nivel_cliente: 'Nível'
}

const MAX_CORRECOES_VISIVEIS = 5

const correcoes = computed(() => {
  const contagem = new Map()

  props.clientes.forEach(cliente => {
    const originais = cliente.etl_original || {}

    Object.keys(CAMPOS_CORRIGIDOS).forEach(campo => {
      if (!(campo in originais)) return

      const chave = `${campo}|${originais[campo]}|${cliente[campo]}`
      const atual = contagem.get(chave)

      if (atual) {
        atual.quantidade++
      } else {
        contagem.set(chave, {
          campo: CAMPOS_CORRIGIDOS[campo],
          de: originais[campo],
          para: cliente[campo],
          quantidade: 1
        })
      }
    })
  })

  return [...contagem.values()].sort((a, b) => b.quantidade - a.quantidade)
})

const clientesCorrigidos = computed(() => {
  return props.clientes.filter(cliente => {
    const originais = cliente.etl_original || {}
    return Object.keys(CAMPOS_CORRIGIDOS).some(campo => campo in originais)
  }).length
})

const numero = valor => (valor ?? null) === null ? '--' : valor.toLocaleString('pt-BR')

const indicadores = computed(() => [
  { rotulo: 'Clientes importados', valor: numero(props.clientes.length), classe: 'bg-green-50 text-green-700' },
  { rotulo: 'Novos na base', valor: numero(props.registro?.clientesNovos), classe: 'bg-blue-50 text-[#006EB7]' },
  { rotulo: 'Saíram da base', valor: numero(props.registro?.clientesRemovidos), classe: 'bg-gray-50 text-gray-700' },
  { rotulo: 'Corrigidos automaticamente', valor: numero(clientesCorrigidos.value), classe: 'bg-orange-50 text-[#A85700]' }
])
</script>

<template>
  <section
    id="resultado-importacao"
    aria-labelledby="resultado-titulo"
    class="scroll-mt-6 rounded-xl border bg-white p-6 shadow-sm"
    :class="recente ? 'border-green-300' : 'border-gray-200'"
  >
    <header class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <h2
            id="resultado-titulo"
            class="text-lg font-bold text-[#292A2F]"
          >
            Resultado da importação
          </h2>
          <span
            v-if="recente"
            class="rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-700"
          >
            Agora
          </span>
        </div>

        <p class="mt-1 text-xs text-gray-500">
          <template v-if="registro">
            {{ registro.nomeArquivo }}, enviada em {{ formatarDataHora(registro.dataHora) }}.
          </template>
          São estes dados que aparecem no Dashboard e nos Relatórios.
        </p>
      </div>

      <RouterLink
        to="/dashboard"
        class="shrink-0 rounded-md bg-[#006EB7] px-4 py-2.5 text-center text-xs font-semibold text-white shadow-sm transition hover:bg-[#03558c]"
      >
        Ver no Dashboard
      </RouterLink>
    </header>

    <!-- Indicadores -->
    <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div
        v-for="item in indicadores"
        :key="item.rotulo"
        class="rounded-lg px-4 py-3"
        :class="item.classe"
      >
        <dt class="text-xs">{{ item.rotulo }}</dt>
        <dd class="mt-1 text-2xl font-bold">{{ item.valor }}</dd>
      </div>
    </dl>

    <!-- O que foi corrigido -->
    <div class="mt-6">
      <h3 class="text-sm font-bold text-[#292A2F]">
        O que o sistema corrigiu
      </h3>

      <p
        v-if="!correcoes.length"
        class="mt-2 text-sm text-gray-500"
      >
        Nenhuma correção foi necessária: a planilha já veio padronizada.
      </p>

      <ul
        v-else
        class="mt-2 divide-y divide-gray-100 rounded-md border border-gray-100 text-sm"
      >
        <li
          v-for="correcao in correcoes.slice(0, MAX_CORRECOES_VISIVEIS)"
          :key="`${correcao.campo}-${correcao.de}-${correcao.para}`"
          class="flex items-center justify-between gap-3 px-4 py-2.5"
        >
          <span class="min-w-0 text-gray-600">
            <span class="text-xs text-gray-400">{{ correcao.campo }}:</span>
            <span class="font-['IBM_Plex_Mono'] text-xs text-red-500 line-through">{{ correcao.de || '(vazio)' }}</span>
            <span aria-hidden="true"> → </span>
            <span class="sr-only"> corrigido para </span>
            <span class="font-semibold text-[#292A2F]">{{ correcao.para }}</span>
          </span>
          <span class="shrink-0 text-xs text-gray-500">
            {{ correcao.quantidade }}×
          </span>
        </li>
      </ul>

      <p
        v-if="correcoes.length > MAX_CORRECOES_VISIVEIS"
        class="mt-2 text-xs text-gray-500"
      >
        + {{ correcoes.length - MAX_CORRECOES_VISIVEIS }} outra(s) correção(ões).
      </p>
    </div>
  </section>
</template>
