<template>
  <!-- Painel esquerdo das telas de Login e Cadastro: identidade e proposta
       de valor. O título aqui é um <p>, e não <h1>: o título da página é o
       do formulário (uma página, um <h1>).
       Mobile-first: no celular o painel fica compacto (marca + título), para
       o formulário aparecer sem rolar; descrição e rodapé só a partir de md. -->
  <div
    class="relative flex flex-col justify-between overflow-hidden bg-[#0B2545] px-6 py-6 text-white sm:px-8 md:w-1/2 md:px-16 md:py-14 bg-[linear-gradient(to_right,#15335A_1px,transparent_1px),linear-gradient(to_bottom,#15335A_1px,transparent_1px)] bg-[size:40px_40px]"
  >

    <RouterLink
      to="/"
      class="text-xl font-bold tracking-tight text-white md:text-2xl"
    >
      CTI Insights<span class="text-[#FF8F00]">.</span>
    </RouterLink>

    <div class="mt-4 max-w-md md:mt-0">

      <p class="font-['Space_Grotesk'] text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-5xl">
        Transforme dados em
        <span class="text-[#FF8F00]">decisões estratégicas</span>
      </p>

      <p class="mt-6 hidden text-base leading-relaxed text-[#AFC2D8] md:block">
        Acesse o painel inteligente para gestão unificada de clientes,
        faturamento, contratos e telemetria gerada via Python/Pandas
      </p>

    </div>

    <p class="mt-12 hidden text-xs text-[#7891AC] md:block">
      CTI Insights © 2026 — Ambiente Corporativo Seguro
    </p>

  </div>
</template>
