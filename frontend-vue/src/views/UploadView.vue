<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { formatarTamanho, TAMANHO_MAXIMO_MB, useUploadStore } from '../stores/uploadStore'
import Sidebar from '../components/Sidebar.vue'
import AppToast from '../components/AppToast.vue'

// O componente cuida só da interface; quem trata os dados e guarda o
// estado é o store (Pinia) — segue o padrão ensinado em aula.
const upload = useUploadStore()

const fileInput = ref(null)

onMounted(() => {
  // Se já existir uma base salva de um upload anterior, mostra ela na
  // prévia sem precisar reenviar o arquivo, junto com o histórico.
  upload.carregarClientesSalvos()
  upload.carregarHistorico()
})

// Paginação da prévia dos clientes tratados
const ITENS_POR_PAGINA = 10
const paginaAtual = ref(1)

const totalPaginas = computed(() => {
  return Math.max(1, Math.ceil(upload.dadosTratados.length / ITENS_POR_PAGINA))
})

const clientesPaginados = computed(() => {
  const inicio = (paginaAtual.value - 1) * ITENS_POR_PAGINA
  return upload.dadosTratados.slice(inicio, inicio + ITENS_POR_PAGINA)
})

// Sempre que um novo arquivo é processado, volta pra primeira página
watch(() => upload.dadosTratados, () => {
  paginaAtual.value = 1
})

const paginaAnterior = () => {
  if (paginaAtual.value > 1) paginaAtual.value--
}

const proximaPagina = () => {
  if (paginaAtual.value < totalPaginas.value) paginaAtual.value++
}

const openFileSelector = () => {
  if (!upload.carregando) {
    fileInput.value.click()
  }
}

// Retorno do último envio: toast (some sozinho) e, no sucesso, o atalho
// para o Dashboard (etapa "Visualizar" do fluxo).
const toast = ref({ mensagem: '', tipo: 'sucesso' })
const ultimoSucesso = ref(null)

const podeEnviar = computed(() => {
  return Boolean(upload.arquivo) && !upload.erros.length && !upload.carregando
})

const escolherArquivo = file => {
  ultimoSucesso.value = null
  upload.selecionarArquivo(file)
}

const aoSelecionarArquivo = event => {
  const file = event.target.files[0]

  if (file) {
    escolherArquivo(file)
  }

  // Zera o campo: sem isso, escolher de novo o MESMO arquivo (por exemplo,
  // depois de corrigir a planilha) não dispara o evento de mudança.
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
      mensagem: `${resultado.nomeArquivo}: ${resultado.linhasLidas} cliente(s) normalizado(s) e salvo(s).`,
      tipo: 'sucesso'
    }
  } else {
    toast.value = {
      mensagem: `${resultado.nomeArquivo} não foi importado. Veja o motivo abaixo.`,
      tipo: 'erro'
    }
  }
}

// Arrastar e soltar. O contador evita o "pisca" do destaque: dragenter e
// dragleave também disparam ao passar sobre os elementos filhos da área.
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

const formatarDataHora = iso => {
  const data = new Date(iso)
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const ano = data.getFullYear()
  const hora = String(data.getHours()).padStart(2, '0')
  const minuto = String(data.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${ano} - ${hora}:${minuto}`
}

const statusInfo = status => {
  if (status === 'PROCESSANDO') {
    return { texto: 'PROCESSANDO...', classe: 'bg-orange-50 text-[#A85700]' }
  }

  if (status === 'NORMALIZADO') {
    return { texto: '✓ NORMALIZADO', classe: 'bg-green-50 text-green-600' }
  }

  return { texto: '✗ ERRO_SCHEMA', classe: 'bg-red-50 text-red-500' }
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

    <!-- Conteúdo -->
    <main class="mx-auto max-w-5xl px-6 py-12 sm:py-16">

      <!-- Título -->
      <div class="mb-10">
        <h1
          class="text-3xl font-bold tracking-tight text-[#292A2F] md:text-4xl"
        >
          Processamento de Dados
        </h1>

        <p class="mt-3 font-['IBM_Plex_Mono'] text-xs uppercase tracking-wider text-gray-500">
          &gt;_ Selecione arquivos .xlsx, .xls ou .csv para normalização
        </p>
      </div>

      <!-- Área de Upload -->
      <div
        class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10"
      >

        <div
          class="flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition"
          :class="arrastando
            ? 'border-[#006EB7] bg-blue-50/60'
            : 'border-gray-300 hover:border-[#006EB7] hover:bg-blue-50/30'"
          @dragenter.prevent="aoEntrarArrastando"
          @dragover.prevent
          @dragleave.prevent="aoSairArrastando"
          @drop.prevent="aoSoltarArquivo"
        >

          <!-- Ícone -->
          <div
            class="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#006EB7]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.7"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 16V4m0 0L8 8m4-4 4 4M5 20h14"
              />
            </svg>
          </div>

          <!-- Texto -->
          <h2 class="text-lg font-bold text-[#292A2F]">
            {{ arrastando ? 'Solte o arquivo aqui' : 'Arraste sua planilha para iniciar o ETL' }}
          </h2>

          <p class="mt-2 text-sm text-gray-500">
            Motor de processamento via Python preparado.
          </p>

          <!-- Botão -->
          <button
            type="button"
            :disabled="upload.carregando"
            @click="openFileSelector"
            class="mt-6 inline-flex items-center gap-2 rounded-md bg-[#FF8F00] px-6 py-3 text-xs font-semibold text-white shadow-sm transition hover:enabled:bg-[#E68100] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 16V4m0 0L8 8m4-4 4 4M5 20h14"
              />
            </svg>
            {{ upload.arquivo ? 'Trocar Arquivo' : 'Selecionar Arquivo' }}
          </button>

          <!-- Input escondido -->
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,.xls,.csv"
            class="hidden"
            @change="aoSelecionarArquivo"
          />

          <!-- Arquivo selecionado + envio (etapas "Selecionar" e "Validar") -->
          <div
            v-if="upload.arquivo"
            class="mt-5 flex w-full max-w-xl flex-col items-stretch gap-3 rounded-md border border-gray-200 bg-white px-4 py-3 text-left sm:flex-row sm:items-center"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-[#292A2F]">
                {{ upload.arquivo.name }}
              </p>
              <p class="text-[11px] text-gray-500">
                {{ formatarTamanho(upload.arquivo.size) }}
              </p>
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
              <svg
                v-if="upload.carregando"
                class="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  stroke-opacity="0.3"
                  stroke-width="3"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                />
              </svg>
              {{ upload.carregando ? 'Processando...' : 'Enviar e Processar' }}
            </button>
          </div>

          <!-- Retorno de sucesso: atalho para a etapa "Visualizar" -->
          <div
            v-if="ultimoSucesso && !upload.arquivo"
            role="status"
            class="mt-5 flex w-full max-w-xl flex-col gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-left text-sm text-green-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>
              ✓ {{ ultimoSucesso.linhasLidas }} cliente(s) de
              <span class="font-semibold">{{ ultimoSucesso.nomeArquivo }}</span>
              normalizado(s) e salvo(s).
            </p>

            <RouterLink
              to="/dashboard"
              class="shrink-0 rounded-md bg-green-600 px-4 py-2 text-center text-xs font-semibold text-white transition hover:bg-green-700"
            >
              Ver no Dashboard
            </RouterLink>
          </div>

          <!-- Erros do envio: formato inválido, campos obrigatórios etc. -->
          <div
            v-if="upload.erros.length"
            role="alert"
            class="mt-4 w-full max-w-xl rounded-md border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-600"
          >
            <p
              v-for="erro in upload.erros"
              :key="erro"
            >
              {{ erro }}
            </p>
          </div>

          <!-- Formatos -->
          <p class="mt-4 text-[11px] uppercase tracking-wider text-gray-500">
            Formatos aceitos: .xlsx · .xls · .csv — máx. {{ TAMANHO_MAXIMO_MB }} MB
          </p>

          <!-- Colunas esperadas -->
          <p class="mt-2 max-w-xl text-[11px] tracking-wider text-gray-500">
            <span class="uppercase">Colunas obrigatórias (nome exato no cabeçalho):</span>
            consultor, codigo_cliente, nome_cliente, segmento, nivel_cliente
            (A, B ou C), data_contratacao, servicos_contratados.
            Opcional: faturamento_anual.
          </p>

        </div>

      </div>

      <!-- Histórico de Processamento (Telemetria) -->
      <div
        class="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
      >

        <div class="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <h2 class="text-lg font-bold text-[#292A2F]">
            Histórico de Processamento
          </h2>

          <span
            v-if="upload.historico.length"
            class="text-xs text-gray-500"
          >
            {{ upload.historico.length }} {{ upload.historico.length === 1 ? 'ARQUIVO' : 'ARQUIVOS' }}
          </span>
        </div>

        <!-- Sem uploads ainda: mesma linguagem de estado vazio usada no
             resto do app (Dashboard, Relatórios), em vez de sumir. -->
        <p
          v-if="!upload.historico.length"
          class="px-6 py-8 text-center text-sm text-gray-500"
        >
          Nenhum arquivo processado ainda. Envie uma planilha acima pra
          começar o histórico.
        </p>

        <div
          v-else
          class="overflow-x-auto"
        >
          <table class="w-full min-w-[700px] text-left text-xs">

            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-4 font-semibold text-gray-500">
                  ARQUIVO
                </th>

                <th class="px-6 py-4 font-semibold text-gray-500">
                  DATA_PROCESSAMENTO
                </th>

                <th class="px-6 py-4 font-semibold text-gray-500">
                  LINHAS_LIDAS
                </th>

                <th class="px-6 py-4 font-semibold text-gray-500">
                  STATUS_DB
                </th>

                <th class="px-6 py-4 font-semibold text-gray-500">
                  AÇÕES
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="item in upload.historico"
                :key="item.id"
                class="border-t border-gray-100 transition-colors hover:bg-gray-50"
              >
                <td class="px-6 py-4 font-medium text-[#292A2F]">
                  {{ item.nomeArquivo }}
                </td>

                <td class="px-6 py-4 text-gray-500">
                  {{ formatarDataHora(item.dataHora) }}
                </td>

                <td class="px-6 py-4 text-gray-500">
                  {{ item.linhasLidas ?? '--' }}
                </td>

                <td class="px-6 py-4">
                  <span
                    class="rounded-full px-3 py-1 text-[11px] font-semibold"
                    :class="statusInfo(item.status).classe"
                  >
                    {{ statusInfo(item.status).texto }}
                  </span>

                  <p
                    v-if="item.mensagem"
                    class="mt-1 text-[11px] text-gray-500"
                  >
                    {{ item.mensagem }}
                  </p>
                </td>

                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">

                    <!-- Baixar o arquivo original: só existe pra quem deu
                         erro, pra reabrir e corrigir a coluna problemática -->
                    <button
                      v-if="item.status === 'ERRO_SCHEMA'"
                      type="button"
                      @click="upload.baixarOriginal(item)"
                      class="text-gray-400 transition hover:text-[#006EB7]"
                      aria-label="Baixar arquivo original"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="1.7"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                        />
                      </svg>
                    </button>

                    <!-- PROCESSANDO: X (ainda em andamento).
                         NORMALIZADO/ERRO_SCHEMA: lixeira (remover). -->
                    <button
                      type="button"
                      @click="upload.removerDoHistorico(item.id)"
                      class="text-gray-400 transition hover:text-red-500"
                      :aria-label="item.status === 'PROCESSANDO' ? 'Cancelar' : 'Remover do histórico'"
                    >
                      <svg
                        v-if="item.status === 'PROCESSANDO'"
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="1.7"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M6 18 18 6M6 6l12 12"
                        />
                      </svg>

                      <svg
                        v-else
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="1.7"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                    </button>

                  </div>
                </td>
              </tr>
            </tbody>

          </table>
        </div>

      </div>

      <!-- Prévia dos dados tratados (lida direto do store, igual a aula) -->
      <div
        v-if="upload.temDados"
        class="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
      >

        <div class="border-b border-gray-200 px-6 py-5">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#006EB7]">
            Dados encontrados
          </p>

          <h2 class="mt-1 text-lg font-bold text-[#292A2F]">
            Prévia dos clientes tratados
          </h2>

          <p class="mt-1 text-xs text-gray-500">
            Total: {{ upload.totalClientes }} · Clientes Nível A: {{ upload.clientesNivelA }}
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[600px] text-left text-xs">

            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-4 font-semibold text-gray-500">Código</th>
                <th class="px-6 py-4 font-semibold text-gray-500">Cliente</th>
                <th class="px-6 py-4 font-semibold text-gray-500">Consultor</th>
                <th class="px-6 py-4 font-semibold text-gray-500">Segmento</th>
                <th class="px-6 py-4 font-semibold text-gray-500">Nível</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(cliente, indice) in clientesPaginados"
                :key="`${cliente.codigo_cliente}-${indice}`"
                class="border-t border-gray-100 transition-colors hover:bg-gray-50"
              >
                <td class="px-6 py-4 text-gray-500">{{ cliente.codigo_cliente || '—' }}</td>
                <td class="px-6 py-4 font-medium text-[#292A2F]">{{ cliente.nome_cliente || '—' }}</td>
                <td class="px-6 py-4 text-gray-500">{{ cliente.consultor || '—' }}</td>
                <td class="px-6 py-4 text-gray-500">{{ cliente.segmento || '—' }}</td>
                <td class="px-6 py-4">
                  <span class="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-[#006EB7]">
                    {{ cliente.nivel_cliente || '—' }}
                  </span>
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

    </main>

    </div>

    <AppToast
      :mensagem="toast.mensagem"
      :tipo="toast.tipo"
      @fechar="toast.mensagem = ''"
    />

  </div>
</template>
