<script setup>
import { computed, onMounted, ref } from 'vue'
import { formatarTamanho, TAMANHO_MAXIMO_MB, useUploadStore } from '../stores/uploadStore'
import { formatarDataHora } from '../utils/datas'
import Sidebar from '../components/Sidebar.vue'
import AppToast from '../components/AppToast.vue'
import PreviaClientes from '../components/PreviaClientes.vue'
import TabelaProblemas from '../components/TabelaProblemas.vue'
import EtapasImportacao from '../components/upload/EtapasImportacao.vue'
import GuiaPlanilha from '../components/upload/GuiaPlanilha.vue'
import ResultadoImportacao from '../components/upload/ResultadoImportacao.vue'
import HistoricoEnvios from '../components/upload/HistoricoEnvios.vue'

// A tela cuida só da interface e do fluxo de envio; quem trata os dados e
// guarda o estado é o store (Pinia).
const upload = useUploadStore()

onMounted(() => {
  upload.carregarClientesSalvos()
  upload.carregarHistorico()
})

// ---------------------------------------------------------------------------
// Retorno do último envio
// ---------------------------------------------------------------------------
const toast = ref({ mensagem: '', tipo: 'sucesso' })
const ultimoSucesso = ref(null)
// Envio recusado na validação das linhas (tem a tabela linha → problema)
const ultimoErro = ref(null)
// Qualquer falha no último envio, inclusive arquivo ilegível
const envioFalhou = ref(false)

const podeEnviar = computed(() => {
  return Boolean(upload.arquivo) && !upload.erros.length && !upload.carregando
})

// A base mostrada no resultado é a que acabou de ser importada?
const resultadoRecente = computed(() => {
  return Boolean(ultimoSucesso.value && upload.origemBaseAtual?.id === ultimoSucesso.value.id)
})

// ---------------------------------------------------------------------------
// Etapas: derivadas do estado real da tela (nada de progresso simulado)
// ---------------------------------------------------------------------------
const mostrarEtapas = computed(() => {
  return Boolean(upload.arquivo || upload.carregando || ultimoSucesso.value || envioFalhou.value)
})

const etapas = computed(() => {
  // Formato ou tamanho inválido é recusado já na escolha (etapa 1)
  const arquivoRecusado = Boolean(upload.arquivo && upload.erros.length && !upload.carregando)
  const escolheu = Boolean(upload.arquivo || ultimoSucesso.value || envioFalhou.value)

  let escolher = 'atual'
  if (arquivoRecusado) escolher = 'erro'
  else if (escolheu) escolher = 'feito'

  let conferir = 'pendente'
  if (upload.carregando) conferir = 'atual'
  else if (envioFalhou.value) conferir = 'erro'
  else if (ultimoSucesso.value) conferir = 'feito'
  else if (upload.arquivo && !arquivoRecusado) conferir = 'atual'

  return [
    { titulo: 'Escolher planilha', status: escolher },
    { titulo: upload.carregando ? 'Conferindo e padronizando...' : 'Conferir e padronizar', status: conferir },
    { titulo: 'Pronto para análise', status: ultimoSucesso.value ? 'feito' : 'pendente' }
  ]
})

// ---------------------------------------------------------------------------
// Seleção e envio
// ---------------------------------------------------------------------------
const fileInput = ref(null)

const abrirSeletor = () => {
  if (!upload.carregando) {
    fileInput.value.click()
  }
}

const escolherArquivo = file => {
  ultimoSucesso.value = null
  ultimoErro.value = null
  envioFalhou.value = false
  upload.selecionarArquivo(file)
}

const aoSelecionarArquivo = event => {
  const file = event.target.files[0]

  if (file) {
    escolherArquivo(file)
  }

  // Sem isso, escolher de novo o MESMO arquivo (depois de corrigir a
  // planilha) não dispara o evento de mudança.
  event.target.value = ''
}

const enviarEProcessar = async () => {
  if (!podeEnviar.value) {
    return
  }

  toast.value = { mensagem: '', tipo: 'sucesso' }
  const resultado = await upload.processarPlanilha()

  if (!resultado) {
    return
  }

  if (resultado.status === 'NORMALIZADO') {
    ultimoSucesso.value = resultado
    toast.value = {
      mensagem: `${resultado.linhasLidas} cliente(s) importado(s).`,
      tipo: 'sucesso'
    }
  } else {
    envioFalhou.value = true
    ultimoErro.value = resultado.problemas?.length ? resultado : null
    toast.value = {
      mensagem: `${resultado.nomeArquivo} não foi importado. Veja o motivo na tela.`,
      tipo: 'erro'
    }
  }
}

// ---------------------------------------------------------------------------
// Arrastar e soltar. O contador evita o "pisca" do destaque: dragenter e
// dragleave também disparam ao passar sobre os elementos filhos da área.
// ---------------------------------------------------------------------------
const arrastando = ref(false)
let contadorArraste = 0

const aoEntrarArrastando = () => {
  contadorArraste++
  arrastando.value = true
}

const aoSairArrastando = () => {
  contadorArraste = Math.max(0, contadorArraste - 1)

  if (contadorArraste === 0) {
    arrastando.value = false
  }
}

const aoSoltarArquivo = event => {
  contadorArraste = 0
  arrastando.value = false

  if (upload.carregando) {
    return
  }

  const file = event.dataTransfer?.files?.[0]

  if (file) {
    escolherArquivo(file)
  }
}
</script>

<template>
  <!-- dragover/drop no container todo: soltar o arquivo fora da área de
       upload não deve fazer o navegador abrir o arquivo e sair do app. -->
  <div
    class="flex min-h-screen flex-col md:flex-row"
    @dragover.prevent
    @drop.prevent
  >
    <Sidebar />

    <div class="grid-background flex-1">
      <main class="mx-auto max-w-5xl space-y-8 px-6 py-12 sm:py-16">

        <header>
          <h1 class="text-3xl font-bold tracking-tight text-[#292A2F] md:text-4xl">
            Importar clientes
          </h1>
          <p class="mt-3 max-w-2xl text-sm text-gray-500">
            Envie a planilha de clientes. O sistema confere os dados, corrige
            erros de digitação e atualiza o Dashboard.
          </p>
        </header>

        <!-- Envio + apoio lateral -->
        <div class="grid gap-6 lg:grid-cols-3">

          <section
            aria-labelledby="envio-titulo"
            class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2"
          >
            <h2 id="envio-titulo" class="sr-only">Enviar planilha</h2>

            <div
              role="region"
              aria-label="Área para arrastar e soltar a planilha"
              class="flex min-h-[260px] flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition"
              :class="arrastando
                ? 'border-[#006EB7] bg-blue-50/60'
                : 'border-gray-300 hover:border-[#006EB7] hover:bg-blue-50/30'"
              @dragenter.prevent="aoEntrarArrastando"
              @dragover.prevent
              @dragleave.prevent="aoSairArrastando"
              @drop.prevent="aoSoltarArquivo"
            >
              <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#006EB7]">
                <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M5 20h14" />
                </svg>
              </div>

              <p class="text-lg font-bold text-[#292A2F]">
                {{ arrastando ? 'Solte o arquivo aqui' : 'Arraste sua planilha para cá' }}
              </p>
              <p class="mt-1 text-sm text-gray-500">
                ou procure no computador
              </p>

              <button
                type="button"
                :disabled="upload.carregando"
                class="mt-5 inline-flex items-center gap-2 rounded-md bg-[#FF8F00] px-6 py-3 text-xs font-semibold text-white shadow-sm transition hover:enabled:bg-[#E68100] disabled:cursor-not-allowed disabled:opacity-50"
                @click="abrirSeletor"
              >
                {{ upload.arquivo ? 'Trocar arquivo' : 'Selecionar arquivo' }}
              </button>

              <input
                ref="fileInput"
                type="file"
                accept=".xlsx,.xls,.csv"
                class="hidden"
                aria-hidden="true"
                tabindex="-1"
                @change="aoSelecionarArquivo"
              />
            </div>

            <!-- Arquivo escolhido + envio -->
            <div
              v-if="upload.arquivo"
              class="mt-5 flex flex-col items-stretch gap-3 rounded-md border border-gray-200 px-4 py-3 sm:flex-row sm:items-center"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-[#292A2F]">{{ upload.arquivo.name }}</p>
                <p class="text-[11px] text-gray-500">{{ formatarTamanho(upload.arquivo.size) }}</p>
              </div>

              <button
                v-if="!upload.carregando"
                type="button"
                class="text-xs font-semibold text-gray-500 transition hover:text-red-500"
                @click="upload.descartarArquivo()"
              >
                Remover
              </button>

              <button
                type="button"
                :disabled="!podeEnviar"
                class="inline-flex items-center justify-center gap-2 rounded-md bg-[#006EB7] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:enabled:bg-[#03558c] disabled:cursor-not-allowed disabled:opacity-50"
                @click="enviarEProcessar"
              >
                <svg v-if="upload.carregando" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.3" stroke-width="3" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                </svg>
                {{ upload.carregando ? 'Importando...' : 'Importar planilha' }}
              </button>
            </div>

            <!-- Etapas -->
            <EtapasImportacao
              v-if="mostrarEtapas"
              class="mt-5"
              :etapas="etapas"
              :carregando="upload.carregando"
            />

            <!-- Sucesso: aponta para o resultado logo abaixo -->
            <p
              v-if="ultimoSucesso && !upload.arquivo"
              role="status"
              class="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              ✓ Importação concluída.
              <a href="#resultado-importacao" class="font-semibold underline">Ver o resultado</a>
            </p>

            <!-- Recusado na validação das linhas -->
            <div
              v-if="ultimoErro && !upload.arquivo"
              role="alert"
              class="mt-4 space-y-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p>
                <span class="font-semibold">{{ ultimoErro.nomeArquivo }} não foi importado.</span>
                {{ ultimoErro.linhasComProblema }} de {{ ultimoErro.linhasLidas }} linha(s) precisam de ajuste.
                {{ upload.temDados ? 'Os dados anteriores continuam valendo.' : '' }}
              </p>

              <TabelaProblemas
                :problemas="ultimoErro.problemas"
                :total="ultimoErro.totalProblemas"
              />

              <button
                v-if="ultimoErro.conteudoOriginal"
                type="button"
                class="text-xs font-semibold text-red-700 underline"
                @click="upload.baixarOriginal(ultimoErro)"
              >
                Baixar a planilha enviada para corrigir
              </button>
            </div>

            <!-- Demais erros: formato, tamanho, arquivo ilegível -->
            <div
              v-else-if="upload.erros.length"
              role="alert"
              class="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              <p v-for="erro in upload.erros" :key="erro">{{ erro }}</p>
            </div>
          </section>

          <aside class="space-y-6" aria-label="Ajuda e base atual">
            <GuiaPlanilha :tamanho-maximo-mb="TAMANHO_MAXIMO_MB" />

            <section
              aria-labelledby="base-titulo"
              class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <h2 id="base-titulo" class="text-sm font-bold text-[#292A2F]">
                Base em uso
              </h2>

              <template v-if="upload.temDados">
                <p class="mt-2 text-2xl font-bold text-[#006EB7]">
                  {{ upload.totalClientes.toLocaleString('pt-BR') }}
                  <span class="text-sm font-medium text-gray-500">clientes</span>
                </p>
                <p v-if="upload.origemBaseAtual" class="mt-1 text-xs text-gray-500">
                  Atualizada em
                  <time :datetime="upload.origemBaseAtual.dataHora">{{ formatarDataHora(upload.origemBaseAtual.dataHora) }}</time>
                </p>
              </template>

              <p v-else class="mt-2 text-sm text-gray-500">
                Nenhuma base importada ainda.
              </p>
            </section>
          </aside>
        </div>

        <!-- Último envio falhou: a base mostrada abaixo é a anterior -->
        <p
          v-if="upload.temDados && upload.ultimoEnvioComErro && !ultimoErro"
          class="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"
        >
          A última planilha enviada ({{ upload.ultimoEnvioComErro.nomeArquivo }}) teve erro
          e não foi importada. O resultado abaixo é da importação anterior.
        </p>

        <ResultadoImportacao
          v-if="upload.temDados"
          :clientes="upload.dadosTratados"
          :registro="upload.origemBaseAtual"
          :recente="resultadoRecente"
        />

        <section
          v-if="upload.temDados"
          aria-labelledby="previa-titulo"
          class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 id="previa-titulo" class="mb-4 text-lg font-bold text-[#292A2F]">
            Clientes da base
          </h2>
          <PreviaClientes :clientes="upload.dadosTratados" />
        </section>

        <HistoricoEnvios />
      </main>
    </div>

    <AppToast
      :mensagem="toast.mensagem"
      :tipo="toast.tipo"
      @fechar="toast.mensagem = ''"
    />
  </div>
</template>
