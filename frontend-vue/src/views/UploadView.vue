<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useUploadStore } from '../stores/uploadStore'
import Sidebar from '../components/Sidebar.vue'

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
  fileInput.value.click()
}

const aoSelecionarArquivo = event => {
  const file = event.target.files[0]

  if (!file) {
    return
  }

  upload.selecionarArquivo(file)
  upload.processarPlanilha()

  // Zera o campo: sem isso, enviar de novo o MESMO arquivo (por exemplo,
  // depois de corrigir a planilha) não dispara o evento de mudança.
  event.target.value = ''
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
  <div class="flex min-h-screen flex-col md:flex-row">

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
          &gt;_ Selecione arquivos .xlsx ou .csv para normalização
        </p>
      </div>

      <!-- Área de Upload -->
      <div
        class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10"
      >

        <div
          class="flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 text-center transition hover:border-[#006EB7] hover:bg-blue-50/30"
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
            Arraste sua planilha para iniciar o ETL
          </h2>

          <p class="mt-2 text-sm text-gray-500">
            {{ upload.carregando ? 'Processando...' : 'Motor de processamento via Python preparado.' }}
          </p>

          <!-- Botão -->
          <button
            type="button"
            @click="openFileSelector"
            class="mt-6 rounded-md bg-[#FF8F00] px-6 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#E68100]"
          >
            Selecionar Arquivo
          </button>

          <!-- Input escondido -->
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,.xls,.csv"
            class="hidden"
            @change="aoSelecionarArquivo"
          />

          <!-- Arquivo selecionado -->
          <p
            v-if="upload.arquivo"
            class="mt-4 text-xs font-medium text-[#006EB7]"
          >
            Arquivo selecionado: {{ upload.arquivo.name }}
          </p>

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
            Formatos aceitos: .xlsx · .csv — máx. 20mb
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

  </div>
</template>
