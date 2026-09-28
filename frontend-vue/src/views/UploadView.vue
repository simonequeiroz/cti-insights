<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { useUploadStore } from '../stores/uploadStore'
import Sidebar from '../components/Sidebar.vue'
import PassosImportacao from '../components/importacao/PassosImportacao.vue'
import EtapaEnviar from '../components/importacao/EtapaEnviar.vue'
import EtapaRevisar from '../components/importacao/EtapaRevisar.vue'
import EtapaConfirmar from '../components/importacao/EtapaConfirmar.vue'
import EtapaConcluido from '../components/importacao/EtapaConcluido.vue'
import HistoricoEnvios from '../components/importacao/HistoricoEnvios.vue'

// Assistente de importação em 4 etapas. A tela só controla em qual etapa
// está; ler, validar e salvar é tudo responsabilidade do store (Pinia).
const upload = useUploadStore()

const etapa = ref(1)
const registroConcluido = ref(null)
const tituloEtapa = ref(null)

onMounted(async () => {
  await upload.carregarClientesSalvos()
  upload.carregarHistorico()

  // Voltou pra tela com uma análise ainda aberta: retoma na revisão
  if (upload.analise) etapa.value = 2
})

// Ao trocar de etapa, leva o foco (e a rolagem) pro topo do assistente
const irPara = async numero => {
  etapa.value = numero
  await nextTick()
  tituloEtapa.value?.focus()
}

const aoConfirmar = registro => {
  registroConcluido.value = registro
  irPara(4)
}

const novaImportacao = () => {
  registroConcluido.value = null
  upload.descartarArquivo()
  irPara(1)
}
</script>

<template>
  <!-- dragover/drop no container todo: soltar o arquivo fora da área não
       deve fazer o navegador abrir o arquivo e sair do app. -->
  <div class="flex min-h-screen flex-col md:flex-row" @dragover.prevent @drop.prevent>
    <Sidebar />

    <div class="grid-background flex-1">
      <main class="mx-auto max-w-4xl space-y-8 px-6 py-12 sm:py-16">
        <header>
          <h1
            ref="tituloEtapa"
            tabindex="-1"
            class="text-3xl font-bold tracking-tight text-[#292A2F] outline-none md:text-4xl"
          >
            Importar clientes
          </h1>
          <p class="mt-3 text-sm text-gray-500">
            Envie a planilha, revise o que o sistema encontrou e confirme.
            Os insights são gerados a partir da base importada.
          </p>
        </header>

        <PassosImportacao :etapa-atual="etapa" />

        <EtapaEnviar v-if="etapa === 1" @analisado="irPara(2)" />

        <EtapaRevisar
          v-else-if="etapa === 2 && upload.analise"
          @voltar="irPara(1)"
          @continuar="irPara(3)"
        />

        <EtapaConfirmar
          v-else-if="etapa === 3 && upload.analise"
          @voltar="irPara(2)"
          @confirmado="aoConfirmar"
        />

        <EtapaConcluido
          v-else-if="etapa === 4 && registroConcluido"
          :registro="registroConcluido"
          @nova="novaImportacao"
        />

        <HistoricoEnvios />
      </main>
    </div>
  </div>
</template>
