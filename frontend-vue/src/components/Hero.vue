<template>
  <!-- Hero: seção principal (fica dentro do <main> da Home) -->
  <section id="inicio" class="pt-10 pb-10 sm:pt-16 sm:pb-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">

      <!-- Eyebrow -->
      <div class="text-xs sm:text-sm tracking-[0.14em] uppercase text-cti-azul font-bold mb-6 flex items-center gap-2.5">
        <span class="w-2.5 h-2.5 bg-cti-laranja rounded-full inline-block"></span>
        Automação e Consolidação de Dados
      </div>

      <!-- Título principal: mobile-first, cresce a cada breakpoint
           (36px → 48px → 60px → 72px) -->
      <h1 class="font-['Space_Grotesk'] font-bold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-[-0.025em] text-cti-grafite-home max-w-[800px] m-0">
        Da planilha bruta<br>à <em class="not-italic text-cti-azul underline decoration-cti-laranja decoration-[5px] underline-offset-[6px]">ação estratégica</em>.
      </h1>

      <!-- Subtítulo -->
      <p class="mt-6 sm:mt-7 text-base sm:text-lg leading-[1.6] text-cti-cinza max-w-[580px]">
        Envie a planilha da sua carteira de clientes e veja em minutos quanto fatura cada segmento, nível e consultor, e quais clientes podem contratar mais serviços.
      </p>

      <!-- Botões (textos do Figma): empilhados no mobile, lado a lado a
           partir de sm. Os dois levam a telas do sistema, que exigem login:
           a guarda de rota manda para /login e, depois de entrar, volta para
           o destino pedido (Upload ou Dashboard). -->
      <div class="flex flex-col sm:flex-row gap-4 mt-8 sm:mt-10">
        <router-link to="/upload" class="bg-cti-azul text-cti-fundo px-8 py-4 text-base font-medium rounded inline-flex items-center justify-center gap-2.5 hover:-translate-y-0.5 hover:bg-cti-azul-escuro transition-transform shadow-[0_8px_20px_rgba(0,110,183,0.3)]">
          Importar Base de Clientes →
        </router-link>
        <router-link to="/dashboard" class="px-8 py-4 text-base font-medium text-center text-cti-grafite-home border border-cti-linha rounded bg-white/90 hover:border-cti-grafite-home hover:bg-white transition-colors">
          Visualizar Dashboard
        </router-link>
      </div>

    </div>
  </section>
</template>
