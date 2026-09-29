<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// O nome vem da API quando ela informar; enquanto isso, é derivado do
// e-mail digitado no login (veja authStore). O cargo "Consultor" ainda é
// fixo: não existe perfil no back-end.
const emailUsuario = computed(() => auth.email || 'consultor@cti.com')
const nomeExibido = computed(() => auth.nome || 'Consultor')
const iniciais = computed(() => auth.iniciais)

const linkAtivo = caminho => {
  return route.path === caminho
}

const itensMenu = [
  {
    caminho: '/dashboard',
    rotulo: 'Dashboard',
    icone: 'M3 3v18h18M7 15l4-6 3 4 5-8'
  },
  {
    caminho: '/upload',
    rotulo: 'Upload',
    icone: 'M12 16V4m0 0L8 8m4-4 4 4M5 20h14'
  },
  {
    caminho: '/relatorios',
    rotulo: 'Relatórios',
    icone: 'M9 17V9m3 8V5m3 12v-6M5 21h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z'
  }
]

// Menu hambúrguer (só aparece abaixo de md). No desktop a sidebar é fixa.
const menuAberto = ref(false)

const alternarMenu = () => {
  menuAberto.value = !menuAberto.value
}

const fecharMenu = () => {
  menuAberto.value = false
}

// Ao navegar para outra tela, o menu fecha sozinho.
watch(() => route.path, fecharMenu)

const aoPressionarTecla = evento => {
  if (evento.key === 'Escape') {
    fecharMenu()
  }
}

onMounted(() => window.addEventListener('keydown', aoPressionarTecla))
onUnmounted(() => window.removeEventListener('keydown', aoPressionarTecla))

const sair = async () => {
  await auth.sair()
  router.push('/login')
}
</script>

<template>

  <aside
    class="flex flex-wrap items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:h-screen sm:w-16 sm:shrink-0 md:w-48 sm:flex-col sm:flex-nowrap sm:items-stretch sm:justify-between sm:border-b-0 sm:border-r sm:px-2 sm:py-6 md:px-4 2xl:w-64 2xl:px-5"
  >

    <!-- Logo + botão hambúrguer (mobile) + navegação -->

    <div class="w-full sm:w-auto">

      <div class="flex items-center justify-between sm:block">

        <RouterLink
          to="/dashboard"
          class="text-lg font-bold tracking-tight text-[#006EB7] sm:block sm:text-center md:text-left md:text-xl"
        >
          <span class="sm:hidden md:inline">CTI Insights</span><span class="hidden sm:inline md:hidden">CTI</span><span class="text-[#FF8F00]">.</span>
        </RouterLink>

        <button
          type="button"
          @click="alternarMenu"
          :aria-expanded="menuAberto"
          aria-controls="menu-principal"
          :aria-label="menuAberto ? 'Fechar menu' : 'Abrir menu'"
          class="flex h-10 w-10 items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-100 sm:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              v-if="menuAberto"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 6l12 12M18 6L6 18"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

      </div>

      <div
        id="menu-principal"
        class="sm:block"
        :class="menuAberto ? 'block' : 'hidden'"
      >

        <p class="mt-4 border-b border-dashed border-gray-300 pb-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 sm:hidden md:mb-3.5 md:mt-8 md:block">
          Navegação
        </p>

        <nav class="mt-3 flex flex-col space-y-2 sm:mt-8 md:mt-0">

          <RouterLink
            v-for="item in itensMenu"
            :key="item.caminho"
            :to="item.caminho"
            :title="item.rotulo"
            :aria-label="item.rotulo"
            class="flex items-center gap-3 sm:justify-center md:justify-start"
          >
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]"
              :class="linkAtivo(item.caminho) ? 'bg-[#006EB7]' : 'bg-gray-100'"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-[17px] w-[17px]"
                fill="none"
                viewBox="0 0 24 24"
                :stroke="linkAtivo(item.caminho) ? '#ffffff' : '#6B7280'"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  :d="item.icone"
                />
              </svg>
            </span>

            <span
              class="font-['IBM_Plex_Mono'] text-[12.5px] uppercase tracking-wide sm:hidden md:inline"
              :class="linkAtivo(item.caminho) ? 'font-semibold text-[#006EB7]' : 'font-medium text-gray-500'"
            >{{ item.rotulo }}</span>
          </RouterLink>

        </nav>

      </div>

    </div>

    <!-- Usuário logado + sair (no mobile fica dentro do menu aberto) -->

    <div
      class="w-full border-t border-dashed border-gray-300 pt-4 sm:block sm:w-auto"
      :class="menuAberto ? 'mt-4 block' : 'hidden'"
    >

      <div class="flex items-center gap-3 sm:justify-center md:justify-start">

        <div
          :title="nomeExibido"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#FFF4E5] font-['IBM_Plex_Mono'] text-[11px] font-bold text-[#A85700]">
          {{ iniciais }}
        </div>

        <div class="min-w-0 sm:hidden md:block">
          <p
            class="truncate text-sm font-semibold text-[#292A2F]"
            :title="emailUsuario"
          >
            {{ nomeExibido }}
          </p>

          <p class="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-wide text-gray-500">
            Consultor
          </p>
        </div>

      </div>

      <button
        type="button"
        @click="sair"
        title="Encerrar a Sessão"
        aria-label="Encerrar a Sessão"
        class="mt-4 flex items-center gap-2 text-sm font-medium text-red-500 sm:w-full sm:justify-center md:w-auto md:justify-start transition hover:text-red-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M17 16l4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1"
          />
        </svg>

        <span class="sm:hidden md:inline">Encerrar a Sessão</span>
      </button>

    </div>

  </aside>

</template>
