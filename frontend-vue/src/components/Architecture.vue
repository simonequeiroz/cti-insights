<template>
  <!-- Como funciona: os 3 passos do uso, cada um com a tecnologia que faz
       o trabalho (linha discreta, para quem avalia a arquitetura).
       1 coluna no mobile, 3 a partir de md. -->
  <section id="como-funciona" class="py-16 md:py-24 scroll-mt-4">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">

      <div class="max-w-[640px] mb-10 md:mb-14">
        <span class="text-xs sm:text-[13px] tracking-[0.14em] uppercase text-cti-laranja-texto font-bold mb-4 block">Como funciona</span>
        <h2 class="font-['Space_Grotesk'] font-bold text-3xl md:text-4xl tracking-[-0.02em] text-cti-grafite-home">
          Da planilha de sempre às decisões de venda, em três passos.
        </h2>
      </div>

      <ol
        class="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-cti-linha border border-cti-linha rounded-xl overflow-hidden shadow-sm list-none p-0 m-0">

        <li v-for="(passo, indice) in passos" :key="passo.titulo"
          class="bg-white p-6 sm:p-8 lg:p-10 md:min-h-[260px] flex flex-col justify-between gap-6">
          <div>
            <span class="font-['Space_Grotesk'] font-bold text-4xl text-cti-laranja">{{ indice + 1 }}</span>
            <h3 class="font-['Space_Grotesk'] font-bold text-xl mt-3 mb-3 text-cti-azul">{{ passo.titulo }}</h3>
            <p class="text-base text-cti-cinza leading-[1.6]">{{ passo.texto }}</p>
          </div>
          <p class="text-xs text-[#637A84] font-['IBM_Plex_Mono'] m-0">{{ passo.tecnologia }}</p>
        </li>

      </ol>

    </div>
  </section>

  <!-- Segurança dos dados: mesmo formato do "Como funciona" (título fora,
       grade de células separadas por linhas finas). 1 coluna no celular,
       2 a partir de sm, 4 a partir de lg. -->
  <section id="seguranca" class="pb-16 md:pb-24 scroll-mt-4">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">

      <div class="max-w-[640px] mb-10 md:mb-14">
        <span class="text-xs sm:text-[13px] tracking-[0.14em] uppercase text-cti-laranja-texto font-bold mb-4 block">Segurança</span>
        <h2 class="font-['Space_Grotesk'] font-bold text-3xl md:text-4xl tracking-[-0.02em] text-cti-grafite-home">
          Os dados da sua carteira ficam protegidos.
        </h2>
      </div>

      <ul
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-cti-linha border border-cti-linha rounded-xl overflow-hidden shadow-sm list-none p-0 m-0">

        <li v-for="item in protecoes" :key="item.titulo" class="bg-white p-6 sm:p-8 flex flex-col gap-4">
          <span class="flex h-11 w-11 items-center justify-center rounded-lg bg-cti-azul/10 text-cti-azul" aria-hidden="true">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" :d="item.icone" />
            </svg>
          </span>
          <div>
            <h3 class="font-['Space_Grotesk'] font-bold text-xl mb-2 text-cti-azul">{{ item.titulo }}</h3>
            <p class="text-base text-cti-cinza leading-[1.6] m-0">{{ item.texto }}</p>
          </div>
        </li>

      </ul>

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

// Ícones em traço (contorno) da biblioteca Heroicons (licença MIT)
const protecoes = [
  {
    titulo: 'Acesso aprovado',
    texto: 'Só entra quem tem o cadastro aprovado por um administrador.',
    // cadeado
    icone: 'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z'
  },
  {
    titulo: 'Cada um no seu papel',
    texto: 'Consultor, gestor e administrador só fazem o que a função permite. Excluir clientes e aprovar acessos é só do administrador.',
    // pessoas
    icone: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z'
  },
  {
    titulo: 'Senhas protegidas',
    texto: 'Guardadas criptografadas (BCrypt), nunca como texto. Nem a equipe do sistema consegue lê-las.',
    // chave
    icone: 'M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z'
  },
  {
    titulo: 'Banco seguro na nuvem',
    texto: 'Os dados ficam em PostgreSQL na nuvem, com conexão criptografada (SSL). As senhas do banco nunca vão para o código.',
    // nuvem
    icone: 'M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.5 4.5 0 0 0 2.25 15Z'
  }
]
</script>
