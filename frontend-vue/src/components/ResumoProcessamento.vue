<script setup>
import { computed, ref } from 'vue'
import { distribuicaoNiveis, ESTILO_NIVEL, resumirEtl, temRegistroEtl } from '../utils/resumoEtl'

// Números da base atual e o que o ETL corrigiu nela: é o que mostra, pra
// quem analisa, o efeito do tratamento (hipótese H01), e não só o resultado.
const props = defineProps({
  clientes: { type: Array, required: true }
})

const LIMITE_ITENS = 6

const temRegistro = computed(() => temRegistroEtl(props.clientes))
const resumo = computed(() => resumirEtl(props.clientes))
const niveis = computed(() => distribuicaoNiveis(props.clientes))

const percentualCorrigido = computed(() => {
  if (!props.clientes.length) return 0
  return Math.round((resumo.value.linhasCorrigidas / props.clientes.length) * 100)
})

// Grupos com muitas grafias começam recolhidos em LIMITE_ITENS.
const gruposAbertos = ref(new Set())

const alternarGrupo = campo => {
  const abertos = new Set(gruposAbertos.value)
  abertos.has(campo) ? abertos.delete(campo) : abertos.add(campo)
  gruposAbertos.value = abertos
}

const itensVisiveis = grupo => {
  return gruposAbertos.value.has(grupo.campo) ? grupo.itens : grupo.itens.slice(0, LIMITE_ITENS)
}
</script>

<template>
  <div>
    <!-- Cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Clientes na base
        </p>
        <p class="mt-2 text-2xl font-bold text-[#292A2F]">
          {{ clientes.length }}
        </p>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Linhas corrigidas pelo ETL
        </p>
        <p class="mt-2 text-2xl font-bold text-[#292A2F]">
          <template v-if="temRegistro">
            {{ resumo.linhasCorrigidas }}
            <span class="text-sm font-medium text-gray-500">({{ percentualCorrigido }}%)</span>
          </template>
          <template v-else>—</template>
        </p>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Segmentos
        </p>
        <p
          v-if="temRegistro"
          class="mt-2 text-2xl font-bold text-[#292A2F]"
        >
          {{ resumo.grafiasSegmento }}
          <span class="text-base text-gray-400">→</span>
          {{ resumo.categoriasSegmento }}
        </p>
        <p
          v-else
          class="mt-2 text-2xl font-bold text-[#292A2F]"
        >
          {{ resumo.categoriasSegmento }}
        </p>
        <p class="mt-1 text-[11px] text-gray-500">
          {{ temRegistro ? 'grafias na planilha → categorias' : 'categorias' }}
        </p>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Nível A / B / C
        </p>

        <div
          class="mt-3 flex h-2.5 overflow-hidden rounded-full bg-gray-100"
          role="img"
          :aria-label="niveis.map(n => `Nível ${n.nivel}: ${n.quantidade}`).join(', ')"
        >
          <div
            v-for="n in niveis"
            :key="n.nivel"
            :class="ESTILO_NIVEL[n.nivel].barra"
            :style="{ width: `${n.percentual}%` }"
          />
        </div>

        <div class="mt-2 flex justify-between text-[11px] text-gray-600">
          <span
            v-for="n in niveis"
            :key="n.nivel"
          >
            <span class="font-semibold">{{ n.nivel }}</span> {{ n.quantidade }}
          </span>
        </div>
      </div>
    </div>

    <!-- O que o ETL padronizou -->
    <div class="mt-6 rounded-lg border border-gray-200 bg-white">
      <div class="border-b border-gray-200 px-5 py-4">
        <h3 class="text-sm font-bold text-[#292A2F]">
          O que o ETL padronizou
        </h3>
        <p class="mt-0.5 text-xs text-gray-500">
          Valor como veio na planilha → valor gravado na base.
        </p>
      </div>

      <p
        v-if="!temRegistro"
        class="px-5 py-6 text-sm text-gray-500"
      >
        Esta base foi processada antes do registro de padronizações existir.
        Envie a planilha de novo para ver o que o ETL corrigiu.
      </p>

      <p
        v-else-if="!resumo.padronizacoes.length && !resumo.conversoes.length"
        class="px-5 py-6 text-sm text-gray-500"
      >
        Nenhuma correção foi necessária: os dados já vieram padronizados.
      </p>

      <div
        v-else
        class="grid gap-6 p-5 md:grid-cols-2"
      >
        <div
          v-for="grupo in resumo.padronizacoes"
          :key="grupo.campo"
        >
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {{ grupo.rotulo }}
            <span class="font-normal normal-case tracking-normal">
              · {{ grupo.quantidade }} {{ grupo.quantidade === 1 ? 'valor corrigido' : 'valores corrigidos' }}
            </span>
          </p>

          <ul class="divide-y divide-gray-100 rounded-md border border-gray-100 text-sm">
            <li
              v-for="item in itensVisiveis(grupo)"
              :key="`${item.original}-${item.tratado}`"
              class="flex items-center gap-2 px-3 py-2"
            >
              <span class="truncate font-['IBM_Plex_Mono'] text-xs text-gray-500">"{{ item.original }}"</span>
              <span
                class="text-gray-300"
                aria-hidden="true"
              >→</span>
              <span class="flex-1 truncate font-medium text-[#292A2F]">{{ item.tratado }}</span>
              <span class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                ×{{ item.quantidade }}
              </span>
            </li>
          </ul>

          <button
            v-if="grupo.itens.length > LIMITE_ITENS"
            type="button"
            class="mt-2 text-xs font-semibold text-[#006EB7] hover:underline"
            @click="alternarGrupo(grupo.campo)"
          >
            {{ gruposAbertos.has(grupo.campo) ? 'Mostrar menos' : `Ver todas (${grupo.itens.length})` }}
          </button>
        </div>

        <div
          v-if="resumo.conversoes.length"
          class="md:col-span-2"
        >
          <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Conversões de formato
          </p>

          <ul class="space-y-1 text-sm text-gray-600">
            <li
              v-for="conversao in resumo.conversoes"
              :key="conversao.campo"
            >
              <span class="font-medium text-[#292A2F]">{{ conversao.rotulo }}:</span>
              {{ conversao.quantidade }} {{ conversao.quantidade === 1 ? 'valor convertido' : 'valores convertidos' }}
              para {{ conversao.destino }}
              <span
                v-if="conversao.exemplo"
                class="text-xs text-gray-500"
              >
                (ex.: <span class="font-['IBM_Plex_Mono']">"{{ conversao.exemplo.original }}"</span> → {{ conversao.exemplo.tratado }})
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
