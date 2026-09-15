<script setup>
import { ref } from 'vue'

const fileInput = ref(null)
const selectedFile = ref(null)
const clients = ref([])

const openFileSelector = () => {
  fileInput.value.click()
}

const handleFile = (event) => {
  const file = event.target.files[0]

  if (!file) {
    return
  }

  selectedFile.value = file

  const reader = new FileReader()

  reader.onload = (e) => {
    const content = e.target.result

    const lines = content
      .trim()
      .split('\n')
      .map(line => line.trim())

    const headers = lines[0]
      .split(',')
      .map(header => header.trim())

    clients.value = lines.slice(1).map(line => {
      const values = line.split(',')

      return {
        cliente: values[0]?.trim(),
        segmento: values[1]?.trim(),
        faturamento: Number(values[2]?.trim()),
        nivel: values[3]?.trim(),
      }
    })

    console.log('Colunas encontradas:', headers)
    console.log('Clientes processados:', clients.value)

    // Salva os dados para o Dashboard utilizar depois
    localStorage.setItem(
      'ctiClientes',
      JSON.stringify(clients.value)
    )

    console.log('Dados salvos no localStorage!')
  }

  reader.readAsText(file)
}
</script>

<template>
  <div class="grid-background min-h-screen">

    <!-- Cabeçalho -->
    <header class="border-b border-gray-200 bg-white/95">
      <div
        class="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"
      >
        <RouterLink
          to="/"
          class="text-xl font-bold tracking-tight text-[#2874BE]"
        >
          CTI Insights<span class="text-[#F7941D]">.</span>
        </RouterLink>

        <RouterLink
          to="/"
          class="text-xs text-gray-500 transition hover:text-[#2874BE]"
        >
          ← Voltar
        </RouterLink>
      </div>
    </header>

    <!-- Conteúdo -->
    <main class="mx-auto max-w-5xl px-6 py-12 sm:py-16">

      <!-- Título -->
      <div class="mb-10">
        <p
          class="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2874BE]"
        >
          Importação de dados
        </p>

        <h1
          class="text-3xl font-bold tracking-tight text-[#292A2F] md:text-4xl"
        >
          Importe sua base de clientes.
        </h1>

        <p class="mt-3 max-w-2xl text-sm leading-relaxed text-gray-500">
          Envie sua planilha para que o CTI Insights possa organizar,
          consolidar e preparar os dados para análise.
        </p>
      </div>

      <!-- Área de Upload -->
      <div
        class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10"
      >

        <div
          class="flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 text-center transition hover:border-[#2874BE] hover:bg-blue-50/30"
        >

          <!-- Ícone -->
          <div
            class="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#2874BE]"
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
            Arraste sua planilha aqui
          </h2>

          <p class="mt-2 text-sm text-gray-400">
            ou selecione um arquivo do seu computador
          </p>

          <!-- Botão -->
          <button
            type="button"
            @click="openFileSelector"
            class="mt-6 rounded-md bg-[#2874BE] px-6 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2165A5]"
          >
            Selecionar arquivo
          </button>

          <!-- Input escondido -->
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,.xls,.csv"
            class="hidden"
            @change="handleFile"
          />

          <!-- Arquivo selecionado -->
          <p
            v-if="selectedFile"
            class="mt-4 text-xs font-medium text-[#2874BE]"
          >
            Arquivo selecionado: {{ selectedFile.name }}
          </p>

          <!-- Formatos -->
          <p class="mt-4 text-[10px] uppercase tracking-wider text-gray-400">
            Formatos aceitos: .xlsx, .xls, .csv
          </p>

        </div>

      </div>

      <!-- Etapas -->
      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

        <!-- Etapa 01 -->
        <div class="rounded-lg border border-gray-200 bg-white p-5">
          <p
            class="text-[10px] font-semibold uppercase tracking-wider text-[#2874BE]"
          >
            01
          </p>

          <h3 class="mt-2 text-sm font-bold text-[#292A2F]">
            Envie sua base
          </h3>

          <p class="mt-2 text-xs leading-relaxed text-gray-500">
            Selecione a planilha que contém os dados dos clientes.
          </p>
        </div>

        <!-- Etapa 02 -->
        <div class="rounded-lg border border-gray-200 bg-white p-5">
          <p
            class="text-[10px] font-semibold uppercase tracking-wider text-[#2874BE]"
          >
            02
          </p>

          <h3 class="mt-2 text-sm font-bold text-[#292A2F]">
            Processamento
          </h3>

          <p class="mt-2 text-xs leading-relaxed text-gray-500">
            O sistema organiza e prepara os dados automaticamente.
          </p>
        </div>

        <!-- Etapa 03 -->
        <div class="rounded-lg border border-gray-200 bg-white p-5">
          <p
            class="text-[10px] font-semibold uppercase tracking-wider text-[#2874BE]"
          >
            03
          </p>

          <h3 class="mt-2 text-sm font-bold text-[#292A2F]">
            Visualize
          </h3>

          <p class="mt-2 text-xs leading-relaxed text-gray-500">
            Acesse os indicadores e análises no dashboard.
          </p>
        </div>

      </div>

      <!-- Pré-visualização dos dados -->
      <div
        v-if="clients.length"
        class="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
      >

        <!-- Cabeçalho da tabela -->
        <div class="border-b border-gray-200 px-6 py-5">
          <p
            class="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2874BE]"
          >
            Dados encontrados
          </p>

          <h2 class="mt-1 text-lg font-bold text-[#292A2F]">
            Pré-visualização da base
          </h2>

          <p class="mt-1 text-xs text-gray-500">
            {{ clients.length }} clientes encontrados na planilha.
          </p>
        </div>

        <!-- Tabela -->
        <div class="overflow-x-auto">
          <table class="w-full min-w-[600px] text-left text-xs">

            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-4 font-semibold text-gray-500">
                  Cliente
                </th>

                <th class="px-6 py-4 font-semibold text-gray-500">
                  Segmento
                </th>

                <th class="px-6 py-4 font-semibold text-gray-500">
                  Faturamento
                </th>

                <th class="px-6 py-4 font-semibold text-gray-500">
                  Nível
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="client in clients"
                :key="client.cliente"
                class="border-t border-gray-100"
              >
                <td class="px-6 py-4 font-medium text-[#292A2F]">
                  {{ client.cliente }}
                </td>

                <td class="px-6 py-4 text-gray-500">
                  {{ client.segmento }}
                </td>

                <td class="px-6 py-4 text-gray-500">
                  R$ {{ client.faturamento.toLocaleString('pt-BR') }}
                </td>

                <td class="px-6 py-4">
                  <span
                    class="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold text-[#2874BE]"
                  >
                    {{ client.nivel }}
                  </span>
                </td>
              </tr>
            </tbody>

          </table>
        </div>

      </div>

    </main>

  </div>
</template>