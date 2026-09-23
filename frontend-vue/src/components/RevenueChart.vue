<template>
  <!-- Bloco: Gráfico de Faturamento Consolidado -->
  <div id="resultados" class="max-w-[1360px] mx-auto px-8">
    <div class="border border-[#CDDADF] bg-white/75 backdrop-blur-[8px] rounded-lg p-7 relative overflow-hidden shadow-[0px_10px_30px_rgba(41,41,48,0.05)] mt-4">
      
      <!-- Cabeçalho do Painel -->
      <div class="flex justify-between items-baseline mb-[18px] flex-wrap gap-2">
        <span class="text-xs text-[#637A84] tracking-[0.05em] font-semibold font-['IBM_Plex_Mono']">FATURAMENTO CONSOLIDADO — Q3</span>
        <span class="text-[13px] text-[#292930] font-semibold font-['IBM_Plex_Mono']">R$ 261.580 <span class="text-[#4D7C0F]">↑ 18,2%</span></span>
      </div>

      <!-- Traçado do Gráfico com Animação SVG -->
      <div class="relative">
        <svg class="w-full h-[220px] block overflow-visible" viewBox="0 0 1000 220" preserveAspectRatio="none">
          <line x1="0" y1="180" x2="1000" y2="180" stroke="#CDDADF" stroke-width="1"/>

          <!-- Caminho animado: pathLength normaliza o comprimento do traço,
               assim o dasharray cobre a linha inteira em qualquer largura -->
          <path
            fill="none"
            stroke="#006EB7"
            stroke-width="3"
            pathLength="1000"
            stroke-dasharray="1000"
            stroke-dashoffset="1000"
            class="animate-draw"
            d="M0,150 L80,160 L150,120 L220,140 L300,90 L370,110 L440,70 L520,95 L590,55 L660,75 L740,40 L820,58 L890,25 L960,35"
          />
        </svg>

        <!-- Ponto de Alerta: fora do SVG, porque o SVG é esticado
             (preserveAspectRatio="none") e deformaria o círculo. Posição
             equivale a cx=960/1000 e cy=35 do traçado. -->
        <span class="animate-pop opacity-0 absolute h-3.5 w-3.5 rounded-full bg-[#FF8F00] left-[96%] top-[35px] -ml-[7px] -mt-[7px]"></span>
      </div>

      <!-- Alerta / Sugestão -->
      <div class="text-[12px] text-[#A85700] text-left md:text-right font-['IBM_Plex_Mono'] font-medium mt-2 animate-fadeup opacity-0">
        <span class="text-[#FF8F00]">●</span> ALERTA IDENTIFICADO — AÇÃO SUGERIDA: Focar conversão de Upsell no segmento Indústria (Nível B para A)
      </div>

    </div>
  </div>
</template>

<style scoped>
@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes pop {
  0% { opacity: 0; transform: scale(0); }
  70% { opacity: 1; transform: scale(1.4); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes fadeup {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-draw {
  animation: draw 2.4s cubic-bezier(.2, .7, .3, 1) forwards .3s;
}

.animate-pop {
  animation: pop .4s ease forwards 2.4s;
  transform-origin: center;
}

.animate-fadeup {
  animation: fadeup .5s ease forwards 2.6s;
}
</style>