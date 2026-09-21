<template>
  <!-- Header -->
  <nav class="flex items-center justify-between py-8 px-10 max-w-[1280px] mx-auto w-full">
    <!-- Logo -->
    <div class="font-['Space_Grotesk'] font-bold text-[26px] tracking-tight text-[#006EB7]">
      CTI Insights<span class="text-[#FF8F00]">.</span>
    </div>
    <!-- Menu -->
    <div class="hidden md:flex gap-10 text-base text-[#4A5D66] font-medium">
      <router-link to="/dashboard" class="hover:text-[#292930] transition-colors">Dashboard</router-link>
      <router-link to="/etl" class="hover:text-[#292930] transition-colors">Motor ETL</router-link>
      <router-link to="/consultores" class="hover:text-[#292930] transition-colors">Consultores</router-link>
      <router-link to="/relatorios" class="hover:text-[#292930] transition-colors">Relatórios</router-link>
    </div>
    <!-- Botão -->
    <router-link to="/login" class="bg-[#006EB7] text-[#FAFAF7] px-6 py-3 rounded text-base font-semibold shadow-md hover:bg-[#03558c] transition-all">
      Acessar Sistema
    </router-link>
  </nav>
</template>