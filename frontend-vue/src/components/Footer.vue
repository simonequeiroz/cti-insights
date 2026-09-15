<template>
  <footer class="mt-8 bg-[#292A2F] text-white">

    <div
      class="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 sm:px-10 md:flex-row md:items-center md:justify-between"
    >

      <!-- Logo e descrição -->
      <div>
        <div class="text-lg font-bold">
          CTI Insights<span class="text-[#F7941D]">.</span>
        </div>

        <p class="mt-2 max-w-sm text-xs leading-relaxed text-gray-400">
          Automação, consolidação e visualização de dados
          para decisões mais inteligentes.
        </p>
      </div>

      <!-- Links -->
      <nav class="flex flex-wrap gap-x-6 gap-y-3 text-xs text-gray-400">
        <a
          href="#apresentacao"
          class="transition hover:text-white"
        >
          Apresentação
        </a>

        <a
          href="#etl"
          class="transition hover:text-white"
        >
          Motor ETL
        </a>

        <a
          href="#arquitetura"
          class="transition hover:text-white"
        >
          Arquitetura
        </a>
      </nav>

      <!-- Equipe -->
      <div
        class="flex items-center gap-3 border-l border-white/20 pl-6"
      >
        <!-- Flor delicada -->
        <span class="text-2xl text-[#F7941D]">
          ❀
        </span>

        <div>
          <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Equipe
          </p>

          <p class="mt-1 max-w-xs text-xs leading-relaxed text-gray-300">
            Miguel, Ricardo, Ryan,<br class="hidden sm:block" />
            Simone e Thyphanny
          </p>
        </div>
      </div>

    </div>

    <!-- Copyright -->
    <div class="border-t border-white/10">
      <div
        class="mx-auto max-w-7xl px-6 py-4 text-[10px] text-gray-500 sm:px-10"
      >
        © 2026 CTI Insights. Projeto Integrador.
      </div>
    </div>

  </footer>
</template>