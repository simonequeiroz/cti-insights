<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

// Menu hambúrguer (só aparece abaixo de md). No desktop o menu fica na barra.
const menuAberto = ref(false)

const alternarMenu = () => {
  menuAberto.value = !menuAberto.value
}

const fecharMenu = () => {
  menuAberto.value = false
}

const aoPressionarTecla = evento => {
  if (evento.key === 'Escape') {
    fecharMenu()
  }
}

onMounted(() => window.addEventListener('keydown', aoPressionarTecla))
onUnmounted(() => window.removeEventListener('keydown', aoPressionarTecla))
</script>

<template>
  <!-- Header: identidade visual, navegação e o botão do menu mobile.
       O <nav> fica dentro do <header> (estrutura semântica da página). -->
  <header class="w-full">
    <div class="relative flex items-center justify-between py-6 md:py-8 px-4 sm:px-6 md:px-10 gap-4 max-w-7xl mx-auto">
      <!-- Logo -->
      <a href="#inicio" class="whitespace-nowrap font-['Space_Grotesk'] font-bold text-[22px] md:text-[26px] tracking-tight text-cti-azul">
        CTI Insights<span class="text-cti-laranja">.</span>
      </a>

      <!-- Menu: navega por seções desta mesma página (landing pública).
           Nenhum item aqui leva para telas internas do sistema — quem ainda
           não fez login não deve conseguir "entrar" pelo menu. -->
      <nav aria-label="Seções da página" class="hidden md:flex gap-6 lg:gap-10 text-base text-cti-cinza font-medium">
        <a href="#inicio" class="hover:text-cti-grafite-home transition-colors">Apresentação</a>
        <a href="#como-funciona" class="hover:text-cti-grafite-home transition-colors">Como funciona</a>
        <a href="#seguranca" class="hover:text-cti-grafite-home transition-colors">Segurança</a>
      </nav>

      <!-- Botão (desktop) -->
      <router-link to="/login"
        class="hidden md:inline-block bg-cti-azul text-cti-fundo px-6 py-3 rounded text-base font-semibold whitespace-nowrap shadow-md hover:bg-cti-azul-escuro transition-all">
        Entrar no Sistema
      </router-link>

      <!-- Botão hambúrguer (mobile) -->
      <button
        type="button"
        @click="alternarMenu"
        :aria-expanded="menuAberto"
        aria-controls="menu-mobile"
        :aria-label="menuAberto ? 'Fechar menu' : 'Abrir menu'"
        class="md:hidden flex h-11 w-11 items-center justify-center rounded text-cti-grafite-home hover:bg-white/80 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path v-if="menuAberto" stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Painel do menu mobile: v-if só cria no DOM quando aberto, e
           md:hidden garante que nunca aparece em telas médias/grandes -->
      <nav
        v-if="menuAberto"
        id="menu-mobile"
        aria-label="Seções da página"
        class="md:hidden absolute left-4 right-4 top-full z-50 flex flex-col rounded-lg border border-cti-linha bg-white p-4 shadow-lg"
      >
        <a href="#inicio" @click="fecharMenu" class="rounded px-3 py-3 text-base font-medium text-cti-grafite-home hover:bg-cti-fundo">Apresentação</a>
        <a href="#como-funciona" @click="fecharMenu" class="rounded px-3 py-3 text-base font-medium text-cti-grafite-home hover:bg-cti-fundo">Como funciona</a>
        <a href="#seguranca" @click="fecharMenu" class="rounded px-3 py-3 text-base font-medium text-cti-grafite-home hover:bg-cti-fundo">Segurança</a>
        <router-link
          to="/login"
          @click="fecharMenu"
          class="mt-3 rounded bg-cti-azul px-4 py-3 text-center text-base font-semibold text-cti-fundo hover:bg-cti-azul-escuro"
        >
          Entrar no Sistema
        </router-link>
      </nav>
    </div>
  </header>
</template>
