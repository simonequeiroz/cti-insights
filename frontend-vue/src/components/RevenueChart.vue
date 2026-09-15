<template>
  <section class="px-4 pb-10 sm:px-6 lg:px-10">
    <div class="mx-auto max-w-7xl">

      <!-- Card principal -->
      <div
        class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
      >

        <!-- Cabeçalho do gráfico -->
        <div
          class="flex flex-col gap-3 px-6 pt-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <span
            class="text-[9px] font-semibold uppercase tracking-[0.15em] text-gray-500"
          >
            Faturamento consolidado — Q3
          </span>

          <div class="text-xs font-bold text-gray-800">
            R$ 261.580
            <span class="ml-1 text-[#72B82A]">
              ↑ 18,2%
            </span>
          </div>
        </div>

        <!-- Gráfico -->
        <div class="px-6 pt-5">

          <div class="relative h-36 w-full">

            <!-- Linha horizontal -->
            <div
              class="absolute bottom-4 left-0 right-0 h-px bg-gray-300"
            ></div>

            <!-- Gráfico -->
            <svg
              viewBox="0 0 700 150"
              class="h-full w-full overflow-visible"
              preserveAspectRatio="none"
            >
              <polyline
                points="10,115 70,125 130,75 190,90 250,55 310,78 370,45 430,65 490,35 550,58 610,28 670,50"
                fill="none"
                stroke="#2874BE"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />

              <!-- Ponto final -->
              <circle
                cx="670"
                cy="50"
                r="4"
                fill="#2874BE"
              />
            </svg>

          </div>
        </div>

        <!-- Alerta -->
        <div
          class="flex items-start gap-2 px-6 pb-4 pt-1 text-[9px] font-semibold text-[#F7941D]"
        >
          <span>•</span>

          <span>
            ALERTA IDENTIFICADO — AÇÃO SUGERIDA:
            <span class="font-normal">
              Focar conversão de Upsell no segmento Indústria
              (Nível B para A)
            </span>
          </span>
        </div>

      </div>

    </div>
  </section>
</template>