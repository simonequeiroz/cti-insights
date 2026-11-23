<template>
  <!-- Métricas / KPIs: 1 coluna no mobile, 2 a partir de sm, 4 a partir de lg.
       As linhas entre os cards vêm do gap-px sobre o fundo cinza da grade,
       então funcionam em qualquer quantidade de colunas. -->
  <section class="border-t border-b border-[#CDDADF] bg-white mb-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#CDDADF]">

        <div class="bg-white p-5 md:p-8">
          <h3 class="text-[13px] text-[#4A5D66] mb-3 font-bold font-['IBM_Plex_Mono']">CLIENTES NÍVEL A</h3>
          <p class="font-['Space_Grotesk'] font-bold text-3xl text-[#006EB7] m-0">320</p>
          <p class="text-sm mt-2 font-semibold text-[#4D7C0F]">60% da receita total</p>
        </div>

        <div class="bg-white p-5 md:p-8">
          <h3 class="text-[13px] text-[#4A5D66] mb-3 font-bold font-['IBM_Plex_Mono']">TOTAL DE CLIENTES</h3>
          <p class="font-['Space_Grotesk'] font-bold text-3xl text-[#006EB7] m-0">1.450</p>
          <p class="text-sm mt-2 font-semibold text-[#4D7C0F]">Base atualizada via ETL</p>
        </div>

        <div class="bg-white p-5 md:p-8">
          <h3 class="text-[13px] text-[#4A5D66] mb-3 font-bold font-['IBM_Plex_Mono']">TICKET MÉDIO</h3>
          <p class="font-['Space_Grotesk'] font-bold text-3xl text-[#292930] m-0">R$ 180,4 mil</p>
          <p class="text-sm mt-2 font-semibold text-[#A85700]">Estável vs. ciclo anterior</p>
        </div>

        <div class="bg-white p-5 md:p-8">
          <h3 class="text-[13px] text-[#4A5D66] mb-3 font-bold font-['IBM_Plex_Mono']">INTEGRIDADE DOS DADOS</h3>
          <p class="font-['Space_Grotesk'] font-bold text-3xl text-[#006EB7] m-0">100%</p>
          <p class="text-sm mt-2 font-semibold text-[#4D7C0F]">Relacional (PostgreSQL)</p>
        </div>

      </div>
    </div>
  </section>
</template>
