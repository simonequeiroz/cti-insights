<template>
  <!-- Como funciona: os 3 passos do uso, cada um com a tecnologia que faz
       o trabalho (linha discreta, para quem avalia a arquitetura).
       1 coluna no mobile, 3 a partir de md. -->
  <section id="como-funciona" class="py-16 md:py-24 scroll-mt-4">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">

      <div class="max-w-[640px] mb-10 md:mb-14">
        <span class="text-xs sm:text-[13px] tracking-[0.14em] uppercase text-[#A85700] font-bold mb-4 block">Como funciona</span>
        <h2 class="font-['Space_Grotesk'] font-bold text-3xl md:text-4xl tracking-[-0.02em] text-[#292930]">
          Da planilha de sempre às decisões de venda, em três passos.
        </h2>
      </div>

      <ol
        class="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[#CDDADF] border border-[#CDDADF] rounded-xl overflow-hidden shadow-sm list-none p-0 m-0">

        <li v-for="(passo, indice) in passos" :key="passo.titulo"
          class="bg-white p-6 sm:p-8 lg:p-10 md:min-h-[260px] flex flex-col justify-between gap-6">
          <div>
            <span class="font-['Space_Grotesk'] font-bold text-4xl text-[#FF8F00]">{{ indice + 1 }}</span>
            <h3 class="font-['Space_Grotesk'] font-bold text-xl mt-3 mb-3 text-[#006EB7]">{{ passo.titulo }}</h3>
            <p class="text-base text-[#4A5D66] leading-[1.6]">{{ passo.texto }}</p>
          </div>
          <p class="text-xs text-[#637A84] font-['IBM_Plex_Mono'] m-0">{{ passo.tecnologia }}</p>
        </li>

      </ol>

    </div>
  </section>

  <!-- Segurança dos dados: o que protege as informações da CTI -->
  <section id="seguranca" class="pb-16 md:pb-24 scroll-mt-4">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
      <div class="rounded-xl border border-[#CDDADF] bg-white p-6 sm:p-8 lg:p-10 shadow-sm">
        <span class="text-xs sm:text-[13px] tracking-[0.14em] uppercase text-[#A85700] font-bold mb-4 block">Segurança</span>
        <h2 class="font-['Space_Grotesk'] font-bold text-2xl md:text-3xl tracking-[-0.02em] text-[#292930] mb-6">
          Os dados da sua carteira ficam protegidos.
        </h2>
        <ul class="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 list-none p-0 m-0 text-base text-[#4A5D66] leading-[1.6]">
          <li v-for="item in protecoes" :key="item" class="flex gap-3">
            <span class="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#FF8F00]"></span>
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup>
const passos = [
  {
    titulo: 'Envie a planilha',
    texto: 'Use a planilha da carteira como ela já é hoje (.xlsx ou .csv). Antes de gravar, o sistema mostra as linhas com erro para você conferir.',
    tecnologia: 'Vue 3 · validação no navegador'
  },
  {
    titulo: 'O sistema organiza os dados',
    texto: '"IND.", "industria" e "Indústria" viram um só segmento. Nomes, valores e datas são padronizados, e os cálculos ficam prontos.',
    tecnologia: 'Spring Boot · Python/pandas · PostgreSQL'
  },
  {
    titulo: 'Decida com os insights',
    texto: 'O dashboard mostra faturamento, curva ABC, consultores e oportunidades de upsell, com frases que explicam cada achado.',
    tecnologia: 'Dashboard com Chart.js'
  }
]

const protecoes = [
  'Só entra quem tem cadastro aprovado por um administrador.',
  'Cada papel (consultor, gestor, administrador) vê apenas o que precisa.',
  'As senhas são guardadas criptografadas, nunca em texto.',
  'Os dados ficam em banco na nuvem com conexão segura (SSL), e as credenciais nunca vão para o código.'
]
</script>
