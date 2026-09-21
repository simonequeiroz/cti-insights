<template>
  <header class="w-full border-b border-gray-200 bg-white/95">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

      <!-- Logo -->
      <div class="text-xl font-bold tracking-tight text-[#2874BE]">
        CTI Insights<span class="text-[#F7941D]">.</span>
      </div>

      <!-- Menu -->
      <nav class="hidden items-center gap-20 md:flex">
        <a
          href="#apresentacao"
          class="text-xs text-gray-500 transition hover:text-[#2874BE]"
        >
          Apresentação
        </a>

        <a
          href="#etl"
          class="text-xs text-gray-500 transition hover:text-[#2874BE]"
        >
          Motor ETL
        </a>

        <a
          href="#arquitetura"
          class="text-xs text-gray-500 transition hover:text-[#2874BE]"
        >
          Arquitetura
        </a>
      </nav>

      <!-- Botão -->
      <RouterLink
  to="/login"
  class="rounded-md bg-[#2874BE] px-5 py-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#2165a5]"
>
  Acessar Sistema
</RouterLink>

    </div>
  </header>
</template>