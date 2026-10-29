<template>
  <!-- Footer: 1 coluna no mobile, 2 a partir de sm, 3 a partir de md -->
  <footer class="bg-[#292930] text-[#FAFAF7] py-12 md:py-16 mt-auto">
    <div
      class="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr] gap-10">

      <div class="sm:col-span-2 md:col-span-1">
        <div class="font-['Space_Grotesk'] font-bold text-2xl text-white mb-4">CTI Insights<span
            class="text-[#FF8F00]">.</span></div>
        <p class="text-[#A5A5A5] text-sm leading-[1.6] max-w-[320px] m-0">Transformando a gestão comercial do Provedor
          CTI através da automação de planilhas e inteligência de dados.</p>
      </div>

      <div>
        <h4 class="font-['Space_Grotesk'] text-base mb-5 text-white">Plataforma</h4>
        <!-- "Dashboard Analítico" e "Motor de Upload" existem nesta página
             (rolam até a seção); os dois últimos são telas do sistema
             contratado, por isso levam ao login, não direto à tela. -->
        <ul class="list-none p-0 m-0 space-y-3 text-sm text-[#A5A5A5]">
          <li><a href="#resultados" class="hover:text-[#FF8F00] transition-colors">Dashboard Analítico</a></li>
          <li><a href="#arquitetura" class="hover:text-[#FF8F00] transition-colors">Motor de Upload (ETL)</a></li>
          <li><router-link to="/login" class="hover:text-[#FF8F00] transition-colors">Gestão de
              Consultores</router-link></li>
          <li><router-link to="/login" class="hover:text-[#FF8F00] transition-colors">Relatórios de
              Clientes</router-link></li>
        </ul>
      </div>

      <!-- Só informativo (tecnologias do projeto), por isso não são links -->
      <div>
        <h4 class="font-['Space_Grotesk'] text-base mb-5 text-white">Stack Técnico</h4>
        <ul class="list-none p-0 m-0 space-y-3 text-sm text-[#A5A5A5]">
          <li>Vue.js (Front-end)</li>
          <li>Spring Boot (API REST)</li>
          <li>Python/Pandas (Dados)</li>
          <li>PostgreSQL (Banco)</li>
        </ul>
      </div>

    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 text-[13px] text-[#A5A5A5]">
      <div class="border-t border-white/10 mt-10 pt-8">
        <p class="m-0">© 2026 CTI Insights. Todos os direitos reservados.</p>

        <!-- Linha separada do copyright oficial da CTI: identifica o trabalho
             como projeto acadêmico, sem se passar por parte da marca do cliente. -->
        <p class="mt-4 text-xs text-[#6B6B70]">
          Projeto acadêmico — Grupo Data Pulse — SENAI Roberto Mange · Simone, Miguel, Thyphanny, Ryan, Ricardo
        </p>
      </div>
    </div>
  </footer>
</template>
