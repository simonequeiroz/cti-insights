<template>
  <!-- Métricas / KPIs -->
  <section class="border-t border-b border-[#CDDADF] bg-white mb-8">
    <div class="max-w-[1280px] mx-auto px-4 md:px-10 grid grid-cols-2 md:grid-cols-4">

      <div class="p-5 md:p-8 border-r border-b md:border-b-0 border-[#CDDADF] last:border-r-0">
        <h3 class="text-[13px] text-[#4A5D66] mb-3 font-bold font-['IBM_Plex_Mono']">CLIENTES NÍVEL A</h3>
        <p class="font-['Space_Grotesk'] font-bold text-3xl text-[#006EB7] m-0">320</p>
        <p class="text-sm mt-2 font-semibold text-[#4D7C0F]">↑ 60% da receita total</p>
      </div>

      <div class="p-5 md:p-8 border-b md:border-b-0 md:border-r border-[#CDDADF] last:border-r-0">
        <h3 class="text-[13px] text-[#4A5D66] mb-3 font-bold font-['IBM_Plex_Mono']">TOTAL DE CLIENTES</h3>
        <p class="font-['Space_Grotesk'] font-bold text-3xl text-[#006EB7] m-0">1.450</p>
        <p class="text-sm mt-2 font-semibold text-[#4D7C0F]">↑ Base atualizada via ETL</p>
      </div>

      <div class="p-5 md:p-8 border-r border-[#CDDADF] last:border-r-0">
        <h3 class="text-[13px] text-[#4A5D66] mb-3 font-bold font-['IBM_Plex_Mono']">TICKET MÉDIO</h3>
        <p class="font-['Space_Grotesk'] font-bold text-3xl text-[#292930] m-0">R$ 180.4k</p>
        <p class="text-sm mt-2 font-semibold text-[#A85700]">Estável vs. ciclo anterior</p>
      </div>

      <div class="p-5 md:p-8 last:border-r-0">
        <h3 class="text-[13px] text-[#4A5D66] mb-3 font-bold font-['IBM_Plex_Mono']">INTEGRIDADE DOS DADOS</h3>
        <p class="font-['Space_Grotesk'] font-bold text-3xl text-[#006EB7] m-0">100%</p>
        <p class="text-sm mt-2 font-semibold text-[#4D7C0F]">Relacional (PostgreSQL)</p>
      </div>

    </div>
  </section>
</template>