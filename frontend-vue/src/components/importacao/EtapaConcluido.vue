<script setup>
import { computed } from 'vue'
import { useClientesStore } from '../../stores/clientesStore'
import { formatarNumero } from '../../utils/datas'
import { gerarInsights } from '../../utils/insights'

// Etapa 4: confirma o que entrou e já mostra os primeiros insights.
defineProps({
  registro: { type: Object, required: true }
})

const emit = defineEmits(['nova'])
const clientes = useClientesStore()

const insights = computed(() => gerarInsights(clientes.lista))
</script>

<template>
  <section
    aria-labelledby="concluido-titulo"
    class="space-y-6 rounded-xl border border-green-200 bg-white p-6 shadow-sm sm:p-8"
  >
    <header class="flex items-start gap-4" role="status">
      <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-50 text-2xl text-green-600" aria-hidden="true">✓</span>
      <div>
        <h2 id="concluido-titulo" class="text-xl font-bold text-[#292A2F]">
          {{ formatarNumero(registro.linhasImportadas) }} clientes importados
        </h2>
        <p class="mt-1 text-sm text-gray-500">
          {{ registro.nomeArquivo }} · o Dashboard já está atualizado.
          <template v-if="registro.linhasIgnoradas">
            {{ registro.linhasIgnoradas }} linha(s) com erro ficaram de fora.
          </template>
        </p>
      </div>
    </header>

    <div v-if="insights.length">
      <h3 class="mb-3 text-sm font-bold text-[#292A2F]">Primeiros insights</h3>
      <dl class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div
          v-for="item in insights"
          :key="item.rotulo"
          class="rounded-lg bg-blue-50 px-4 py-3"
        >
          <dt class="text-xs text-[#006EB7]">{{ item.rotulo }}</dt>
          <dd class="mt-1 truncate text-xl font-bold text-[#292A2F]">{{ item.valor }}</dd>
          <dd class="text-xs text-gray-500">{{ item.detalhe }}</dd>
        </div>
      </dl>
    </div>

    <footer class="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-between">
      <button
        type="button"
        class="rounded-md border border-gray-300 px-5 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
        @click="emit('nova')"
      >
        Importar outra planilha
      </button>

      <RouterLink
        to="/dashboard"
        class="rounded-md bg-[#006EB7] px-6 py-2.5 text-center text-xs font-semibold text-white shadow-sm transition hover:bg-[#03558c]"
      >
        Ir para o Dashboard
      </RouterLink>
    </footer>
  </section>
</template>
