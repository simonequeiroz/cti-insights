<template>
  <!-- O que o cliente recebe: 1 coluna no mobile, 2 a partir de sm, 4 a
       partir de lg. Sem números de exemplo: os valores reais só aparecem
       no Dashboard, calculados a partir da planilha enviada.
       As linhas entre os cards vêm do gap-px sobre o fundo cinza da grade. -->
  <section class="border-t border-b border-[#CDDADF] bg-white mb-8 mt-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#CDDADF]">

        <div v-for="item in itens" :key="item.titulo" class="bg-white p-5 md:p-8">
          <h3 class="text-[13px] text-[#4A5D66] mb-3 font-bold font-['IBM_Plex_Mono'] uppercase">{{ item.rotulo }}</h3>
          <p class="font-['Space_Grotesk'] font-bold text-xl text-[#006EB7] m-0">{{ item.titulo }}</p>
          <p class="text-sm mt-2 text-[#4A5D66] leading-[1.5]">{{ item.texto }}</p>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup>
const itens = [
  {
    rotulo: 'Onde está a receita',
    titulo: 'Faturamento por segmento e nível',
    texto: 'Quanto cada segmento e cada nível A, B e C representam no faturamento da carteira.'
  },
  {
    rotulo: 'Curva ABC',
    titulo: 'Concentração da carteira',
    texto: 'Quantos clientes sustentam a maior parte da receita, com a curva acumulada.'
  },
  {
    rotulo: 'Equipe',
    titulo: 'Resultado por consultor',
    texto: 'Faturamento e número de clientes sob a gestão de cada consultor.'
  },
  {
    rotulo: 'Upsell',
    titulo: 'Quem pode comprar mais',
    texto: 'Clientes e segmentos com espaço para contratar mais serviços, explicados em frases.'
  }
]
</script>
