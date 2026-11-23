<template>
  <!-- CTA: texto e botão empilhados no mobile, lado a lado a partir de sm -->
  <section class="bg-[#006EB7] text-[#FAFAF7] py-12 md:py-16 mt-5">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
      <h2 class="font-['Space_Grotesk'] font-semibold text-xl sm:text-2xl max-w-[480px] tracking-[-0.02em] m-0">
        Abandone o preenchimento manual. Escale suas decisões comerciais hoje.
      </h2>
      <router-link to="/login"
        class="bg-[#FF8F00] text-[#FAFAF7] font-semibold text-center whitespace-nowrap px-8 py-4 rounded hover:bg-[#E68100] transition-colors">
        Entrar no Sistema →
      </router-link>
    </div>
  </section>
</template>
