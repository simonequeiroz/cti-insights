<template>
  <!-- Footer -->
  <footer class="bg-[#292930] text-[#FAFAF7] py-16 px-8 mt-auto">
    <div class="max-w-[1360px] mx-auto grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 border-b border-white/10 pb-10 mb-8">
      
      <div>
        <div class="font-['Space_Grotesk'] font-bold text-2xl text-white mb-4">CTI Insights<span class="text-[#FF8F00]">.</span></div>
        <p class="text-[#A5A5A5] text-sm leading-[1.6] max-w-[320px] m-0">Transformando a gestão comercial da Provedor CTI através da automação de planilhas e inteligência de dados.</p>
      </div>
      
      <div>
        <h4 class="font-['Space_Grotesk'] text-base mb-5 text-white">Plataforma</h4>
        <ul class="list-none p-0 m-0 space-y-3 text-sm text-[#A5A5A5]">
          <li><router-link to="/dashboard" class="hover:text-[#FF8F00] transition-colors">Dashboard Analítico</router-link></li>
          <li><router-link to="/etl" class="hover:text-[#FF8F00] transition-colors">Motor de Upload (ETL)</router-link></li>
          <li><router-link to="/consultores" class="hover:text-[#FF8F00] transition-colors">Gestão de Consultores</router-link></li>
          <li><router-link to="/relatorios" class="hover:text-[#FF8F00] transition-colors">Catálogo de Serviços</router-link></li>
        </ul>
      </div>

      <div>
        <h4 class="font-['Space_Grotesk'] text-base mb-5 text-white">Stack Técnico</h4>
        <ul class="list-none p-0 m-0 space-y-3 text-sm text-[#A5A5A5]">
          <li><a href="#" class="hover:text-[#FF8F00] transition-colors">Vue.js (Front-end)</a></li>
          <li><a href="#" class="hover:text-[#FF8F00] transition-colors">Spring Boot (API REST)</a></li>
          <li><a href="#" class="hover:text-[#FF8F00] transition-colors">Python/Pandas (Dados)</a></li>
          <li><a href="#" class="hover:text-[#FF8F00] transition-colors">PostgreSQL (Banco)</a></li>
        </ul>
      </div>

      <div>
        <h4 class="font-['Space_Grotesk'] text-base mb-5 text-white">Institucional</h4>
        <ul class="list-none p-0 m-0 space-y-3 text-sm text-[#A5A5A5]">
          <li><a href="#" class="hover:text-[#FF8F00] transition-colors">Suporte Provedor CTI</a></li>
          <li><a href="#" class="hover:text-[#FF8F00] transition-colors">Políticas de Privacidade</a></li>
          <li><a href="#" class="hover:text-[#FF8F00] transition-colors">Termos de Segurança</a></li>
        </ul>
      </div>

    </div>

    <div class="max-w-[1160px] mx-auto flex justify-between items-center flex-wrap gap-4 text-[13px] text-[#A5A5A5]">
      <p class="m-0">© 2026 CTI Comunicação de Dados e Tecnologia LTDA. Todos os direitos reservados.</p>
      <p class="font-['IBM_Plex_Mono'] text-xs text-[#82CC12] m-0">Desenvolvido por Simone Batista & Miguel Viana | SENAI Roberto Mange</p>
    </div>
  </footer>
</template>