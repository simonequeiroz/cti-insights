<script setup>
import { computed } from 'vue'
import { useUploadStore } from '../../stores/uploadStore'
import { formatarNumero } from '../../utils/datas'

// Etapa 3: mostrar o impacto na base e só então salvar.
const emit = defineEmits(['voltar', 'confirmado'])
const upload = useUploadStore()

const analise = computed(() => upload.analise)
const ignoradas = computed(() => analise.value.linhasComErro.length)

const impacto = computed(() => [
  { rotulo: 'Novos clientes', valor: `+${formatarNumero(analise.value.clientesNovos)}`, classe: 'text-green-700' },
  { rotulo: 'Atualizados', valor: formatarNumero(analise.value.clientesAtualizados), classe: 'text-[#292A2F]' },
  { rotulo: 'Saem da base', valor: analise.value.clientesRemovidos ? `−${formatarNumero(analise.value.clientesRemovidos)}` : '0', classe: analise.value.clientesRemovidos ? 'text-[#A85700]' : 'text-[#292A2F]' }
])

const confirmar = async () => {
  const registro = await upload.confirmarImportacao()
  if (registro) emit('confirmado', registro)
}
</script>

<template>
  <section
    aria-labelledby="confirmar-titulo"
    class="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
  >
    <header>
      <h2 id="confirmar-titulo" class="text-xl font-bold text-[#292A2F]">
        Confirme a importação
      </h2>
      <p class="mt-1 text-sm text-gray-500">
        <template v-if="analise.baseAnterior">
          A base atual ({{ formatarNumero(analise.baseAnterior) }} clientes) será substituída por esta.
        </template>
        <template v-else>
          Esta será a primeira base do sistema.
        </template>
      </p>
    </header>

    <dl class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div
        v-for="item in impacto"
        :key="item.rotulo"
        class="rounded-lg bg-gray-50 px-4 py-3"
      >
        <dt class="text-xs text-gray-500">{{ item.rotulo }}</dt>
        <dd class="mt-1 text-2xl font-bold" :class="item.classe">{{ item.valor }}</dd>
      </div>
    </dl>

    <p
      v-if="ignoradas"
      class="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      {{ ignoradas }} linha(s) com erro não serão importadas. Você pode corrigir e enviar de novo depois;
      elas também ficam disponíveis para download no histórico.
    </p>

    <p
      v-if="analise.clientesRemovidos"
      class="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
    >
      {{ analise.clientesRemovidos }} cliente(s) da base atual não estão nesta planilha e vão sair do Dashboard.
    </p>

    <div
      v-if="upload.erros.length"
      role="alert"
      class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
    >
      <p v-for="erro in upload.erros" :key="erro">{{ erro }}</p>
    </div>

    <footer class="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-between">
      <button
        type="button"
        :disabled="upload.carregando"
        class="rounded-md border border-gray-300 px-5 py-2.5 text-xs font-semibold text-gray-600 transition hover:enabled:bg-gray-50 disabled:opacity-50"
        @click="emit('voltar')"
      >
        Voltar
      </button>

      <button
        type="button"
        :disabled="upload.carregando || !upload.podeConfirmar"
        class="inline-flex items-center justify-center gap-2 rounded-md bg-[#FF8F00] px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:enabled:bg-[#E68100] disabled:cursor-not-allowed disabled:opacity-50"
        @click="confirmar"
      >
        <svg v-if="upload.carregando" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.3" stroke-width="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
        </svg>
        {{ upload.carregando ? 'Importando...' : `Importar ${formatarNumero(analise.validos.length)} clientes` }}
      </button>
    </footer>
  </section>
</template>
