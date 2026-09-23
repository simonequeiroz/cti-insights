<template>
  <!-- Hero -->
  <header id="inicio" class="py-16 pb-12">
    <div class="max-w-[1280px] mx-auto px-6 md:px-10">
      
      <!-- Eyebrow -->
      <div class="text-[14px] tracking-[0.14em] uppercase text-[#006EB7] font-bold mb-6 flex items-center gap-2.5">
        <span class="w-2.5 h-2.5 bg-[#FF8F00] rounded-full inline-block"></span>
        Tratamento de Dados via Pandas
      </div>

      <!-- Título Principal Bem Maior -->
      <h1 class="font-['Space_Grotesk'] font-bold text-[clamp(44px,6vw,72px)] leading-[1.02] tracking-[-0.025em] text-[#292930] max-w-[800px] m-0">
        Da planilha bruta<br>à <em class="not-italic text-[#006EB7] underline decoration-[#FF8F00] decoration-[5px] underline-offset-[6px]">ação estratégica</em>.
      </h1>

      <!-- Subtítulo Confortável para Leitura -->
      <p class="mt-7 text-[19px] leading-[1.6] text-[#4A5D66] max-w-[580px]">
        Importe suas planilhas comerciais, consolide faturamentos e centralize a gestão de clientes em um painel interativo — elimine inconsistências operacionais.
      </p>

      <!-- Botões Maiores:
           - Primário leva para o login (única porta de entrada no sistema).
           - Secundário apenas rola até a demonstração nesta mesma página,
             sem exigir acesso, coerente com o papel de uma landing page. -->
      <div class="flex flex-col sm:flex-row gap-4 mt-10">
        <router-link to="/login" class="bg-[#292930] text-[#FAFAF7] px-8 py-4 text-base font-medium rounded inline-flex items-center justify-center gap-2.5 hover:-translate-y-0.5 transition-transform shadow-md">
          Acessar Sistema →
        </router-link>
        <a href="#resultados" class="px-8 py-4 text-base font-medium text-center text-[#292930] border border-[#CDDADF] rounded bg-white/90 hover:border-[#292930] hover:bg-white transition-colors">
          Ver Demonstração
        </a>
      </div>

    </div>
  </header>
</template>