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
  <!-- Header -->
  <nav class="relative flex items-center justify-between py-6 md:py-8 px-6 md:px-10 gap-4 max-w-[1280px] mx-auto w-full">
    <!-- Logo -->
    <div class="font-['Space_Grotesk'] font-bold text-[22px] md:text-[26px] tracking-tight text-[#006EB7]">
      CTI Insights<span class="text-[#FF8F00]">.</span>
    </div>
    <!-- Menu: navega por seções desta mesma página (landing pública).
         Nenhum item aqui leva para telas internas do sistema — quem ainda
         não fez login não deve conseguir "entrar" pelo menu. -->
    <div class="hidden md:flex gap-10 text-base text-[#4A5D66] font-medium">
      <a href="#inicio" class="hover:text-[#292930] transition-colors">Visão Geral</a>
      <a href="#resultados" class="hover:text-[#292930] transition-colors">Resultados</a>
      <a href="#arquitetura" class="hover:text-[#292930] transition-colors">Arquitetura</a>
    </div>
    <!-- Botão (desktop) -->
    <router-link to="/login"
      class="hidden md:inline-block bg-[#006EB7] text-[#FAFAF7] px-6 py-3 rounded text-base font-semibold whitespace-nowrap shadow-md hover:bg-[#03558c] transition-all">
      Acessar Sistema
    </router-link>

    <!-- Botão hambúrguer (mobile) -->
    <button
      type="button"
      @click="alternarMenu"
      :aria-expanded="menuAberto"
      aria-controls="menu-mobile"
      :aria-label="menuAberto ? 'Fechar menu' : 'Abrir menu'"
      class="md:hidden flex h-11 w-11 items-center justify-center rounded text-[#292930] hover:bg-white/80 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path v-if="menuAberto" stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" />
        <path v-else stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <!-- Painel do menu mobile -->
    <div
      v-if="menuAberto"
      id="menu-mobile"
      class="md:hidden absolute left-4 right-4 top-full z-50 flex flex-col rounded-lg border border-[#CDDADF] bg-white p-4 shadow-lg"
    >
      <a href="#inicio" @click="fecharMenu" class="rounded px-3 py-3 text-base font-medium text-[#292930] hover:bg-[#FAFAF7]">Visão Geral</a>
      <a href="#resultados" @click="fecharMenu" class="rounded px-3 py-3 text-base font-medium text-[#292930] hover:bg-[#FAFAF7]">Resultados</a>
      <a href="#arquitetura" @click="fecharMenu" class="rounded px-3 py-3 text-base font-medium text-[#292930] hover:bg-[#FAFAF7]">Arquitetura</a>
      <router-link
        to="/login"
        @click="fecharMenu"
        class="mt-3 rounded bg-[#006EB7] px-4 py-3 text-center text-base font-semibold text-[#FAFAF7] hover:bg-[#03558c]"
      >
        Acessar Sistema
      </router-link>
    </div>
  </nav>
</template>
