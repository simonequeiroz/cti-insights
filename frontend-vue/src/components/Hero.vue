<template>
  <section
    id="apresentacao"
    class="px-6 py-16 md:px-12 lg:px-16 lg:py-20"
  >
    <div class="mx-auto max-w-7xl">

      <!-- Texto principal -->
      <div class="max-w-3xl">

        <!-- Pequeno título -->
        <div class="mb-4 flex items-center gap-2">
          <span class="h-1 w-1 rounded-full bg-[#F7941D]"></span>

          <span
            class="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2874BE]"
          >
            Automação e consolidação de dados
          </span>
        </div>

        <!-- Título -->
        <h1
          class="text-5xl font-bold leading-[1.05] tracking-tight text-[#292A2F] md:text-6xl lg:text-7xl"
        >
          Da planilha bruta
          <br />

          <span class="text-[#2874BE]">
            à ação estratégica
          </span><span class="text-[#292A2F]">.</span>
        </h1>

        <!-- Linha laranja -->
        <div class="mt-3 h-0.5 w-3/4 bg-[#F7941D] md:w-[335px]"></div>

        <!-- Descrição -->
        <p
          class="mt-5 max-w-xl text-sm leading-relaxed text-gray-500 md:text-base"
        >
          Importe suas planilhas comerciais, consolide faturamentos e
          centralize a gestão de clientes em um painel interativo —
          elimine inconsistências operacionais.
        </p>

        <!-- Botões -->
        <div class="mt-9 flex flex-col gap-3 sm:flex-row">

          <RouterLink
  to="/upload"
  class="rounded-md bg-[#2874BE] px-5 py-3 text-xs font-semibold text-white shadow-md transition hover:bg-[#2165A5]"
>
  Importar Base de Clientes →
</RouterLink>

          <RouterLink
  to="/dashboard"
  class="rounded-md border border-gray-300 bg-white px-5 py-3 text-xs font-medium text-gray-600 transition hover:border-[#2874BE] hover:text-[#2874BE]"
>
  Visualizar Dashboard
</RouterLink>

        </div>

      </div>

    </div>
  </section>
</template>