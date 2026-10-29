<template>
  <!-- Arquitetura / Features: 1 coluna no mobile, 3 a partir de md -->
  <section id="arquitetura" class="py-16 md:py-24">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">

      <div class="max-w-[600px] mb-10 md:mb-14">
        <span class="text-xs sm:text-[13px] tracking-[0.14em] uppercase text-[#A85700] font-bold mb-4 block">Arquitetura do
          Sistema</span>
        <h2 class="font-['Space_Grotesk'] font-bold text-3xl md:text-4xl tracking-[-0.02em] text-[#292930]">
          Por que o CTI Insights transforma sua operação.
        </h2>
      </div>

      <div
        class="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[#CDDADF] border border-[#CDDADF] rounded-xl overflow-hidden shadow-sm">

        <div class="bg-white p-6 sm:p-8 lg:p-10 md:min-h-[260px] flex flex-col justify-between">
          <div>
            <div class="w-8 h-[4px] bg-[#FF8F00] mb-6 rounded"></div>
            <h3 class="font-['Space_Grotesk'] font-bold text-xl mb-3 text-[#006EB7]">ETL Automatizado</h3>
            <p class="text-base text-[#4A5D66] leading-[1.6]">Motor em Python/Pandas que recebe, limpa e padroniza
              planilhas comerciais automaticamente, eliminando erros de digitação e duplicidades de segmentos.</p>
          </div>
        </div>

        <div class="bg-white p-6 sm:p-8 lg:p-10 md:min-h-[260px] flex flex-col justify-between">
          <div>
            <div class="w-8 h-[4px] bg-[#FF8F00] mb-6 rounded"></div>
            <h3 class="font-['Space_Grotesk'] font-bold text-xl mb-3 text-[#006EB7]">Visualização Reativa</h3>
            <p class="text-base text-[#4A5D66] leading-[1.6]">Interface responsiva em Vue.js que consome dados de forma
              síncrona. Gráficos que se atualizam imediatamente sem necessidade de exportar relatórios manuais.</p>
          </div>
        </div>

        <div class="bg-white p-6 sm:p-8 lg:p-10 md:min-h-[260px] flex flex-col justify-between">
          <div>
            <div class="w-8 h-[4px] bg-[#FF8F00] mb-6 rounded"></div>
            <h3 class="font-['Space_Grotesk'] font-bold text-xl mb-3 text-[#006EB7]">Gestão Estruturada</h3>
            <p class="text-base text-[#4A5D66] leading-[1.6]">Base de dados sólida em PostgreSQL gerenciada por Spring
              Boot. Histórico, níveis A/B/C e consultores responsáveis mapeados com total integridade referencial.</p>
          </div>
        </div>

      </div>

    </div>
  </section>
</template>
