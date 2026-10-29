<script setup>
import { computed, onMounted, ref } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import AppToast from '../components/AppToast.vue'
import { avaliarUsuario, listarUsuarios } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { formatarDataHora } from '../utils/datas'
import { PAPEIS, rotuloPapel, STATUS_CONTA } from '../utils/papeis'

// Tela do Administrador (rota protegida por "gerenciarUsuarios"):
// aprova ou recusa os cadastros feitos em /cadastro e define o papel de
// cada pessoa. Quem ainda não foi aprovado não consegue fazer login.
const auth = useAuthStore()

const usuarios = ref([])
const carregando = ref(true)
const aviso = ref({ mensagem: '', tipo: 'sucesso' })

// Papel escolhido pelo admin para cada cadastro (começa com o que a
// pessoa pediu; o admin pode trocar antes de aprovar)
const papelEscolhido = ref({})

onMounted(async () => {
  try {
    usuarios.value = await listarUsuarios()
    papelEscolhido.value = Object.fromEntries(usuarios.value.map(usuario => [usuario.id, usuario.papel]))
  } finally {
    carregando.value = false
  }
})

const maisRecentesPrimeiro = (a, b) => b.criadoEm.localeCompare(a.criadoEm)

const pendentes = computed(() => {
  return usuarios.value
    .filter(usuario => usuario.status === STATUS_CONTA.PENDENTE)
    .sort(maisRecentesPrimeiro)
})

const todos = computed(() => [...usuarios.value].sort(maisRecentesPrimeiro))

const SITUACOES = {
  PENDENTE: { texto: 'Aguardando', classe: 'bg-amber-50 text-amber-700' },
  APROVADO: { texto: 'Aprovado', classe: 'bg-green-50 text-green-600' },
  REJEITADO: { texto: 'Recusado', classe: 'bg-red-50 text-red-500' }
}

const avaliar = async (usuario, status) => {
  const papel = papelEscolhido.value[usuario.id]

  try {
    const atualizado = await avaliarUsuario(usuario.id, { status, papel }, auth.responsavel)
    usuarios.value = usuarios.value.map(item => (item.id === atualizado.id ? atualizado : item))

    aviso.value = status === STATUS_CONTA.APROVADO
      ? { mensagem: `${usuario.nome} foi aprovado(a) como ${rotuloPapel(papel)}.`, tipo: 'sucesso' }
      : { mensagem: `O cadastro de ${usuario.nome} foi recusado.`, tipo: 'sucesso' }
  } catch {
    aviso.value = { mensagem: 'Não foi possível salvar. Tente novamente.', tipo: 'erro' }
  }
}
</script>

<template>

  <div class="flex min-h-screen flex-col sm:flex-row">

    <Sidebar />

    <div class="grid-background min-w-0 flex-1">

      <main class="mx-auto max-w-7xl px-6 py-10">

        <!-- TÍTULO -->

        <h1 class="text-3xl font-bold text-[#292A2F]">
          Usuários
        </h1>

        <p class="mt-2 text-sm text-gray-500">
          Aprove ou recuse os cadastros e defina o papel de cada pessoa. Só quem
          foi aprovado consegue entrar no sistema.
        </p>

        <p
          v-if="carregando"
          class="mt-8 text-sm text-gray-500"
        >
          Carregando usuários...
        </p>

        <template v-else>

          <!-- AGUARDANDO APROVAÇÃO -->

          <section
            aria-labelledby="pendentes-titulo"
            class="mt-8 overflow-hidden rounded-lg border border-gray-200 bg-white"
          >

            <div class="border-b border-gray-200 p-5">

              <h2
                id="pendentes-titulo"
                class="text-lg font-bold text-[#292A2F]"
              >
                Aguardando aprovação
                <span class="ml-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-sm font-semibold text-amber-700">
                  {{ pendentes.length }}
                </span>
              </h2>

              <p class="mt-1 text-sm text-gray-500">
                Confira o papel pedido; se precisar, troque antes de aprovar.
              </p>

            </div>

            <p
              v-if="!pendentes.length"
              class="p-5 text-sm text-gray-500"
            >
              Nenhum cadastro aguardando aprovação.
            </p>

            <div
              v-else
              class="relative overflow-x-auto"
            >

              <table class="w-full min-w-[720px] text-left text-sm">

                <thead class="bg-gray-50">
                  <tr>
                    <th class="p-4 font-semibold text-gray-500">Nome</th>
                    <th class="p-4 font-semibold text-gray-500">E-mail</th>
                    <th class="p-4 font-semibold text-gray-500">Papel</th>
                    <th class="p-4 font-semibold text-gray-500">Cadastrado em</th>
                    <th class="p-4 font-semibold text-gray-500">
                      <span class="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="usuario in pendentes"
                    :key="usuario.id"
                    class="border-t border-gray-200"
                  >
                    <td class="p-4 font-medium text-[#292A2F]">
                      {{ usuario.nome }}
                    </td>

                    <td class="p-4 text-gray-500">
                      {{ usuario.email }}
                    </td>

                    <td class="p-4">
                      <select
                        v-model="papelEscolhido[usuario.id]"
                        :aria-label="`Papel de ${usuario.nome}`"
                        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#006EB7]"
                      >
                        <option
                          v-for="item in PAPEIS"
                          :key="item.valor"
                          :value="item.valor"
                        >
                          {{ item.rotulo }}{{ item.valor === usuario.papelSolicitado ? ' (pedido)' : '' }}
                        </option>
                      </select>
                    </td>

                    <td class="p-4 text-gray-500">
                      {{ formatarDataHora(usuario.criadoEm) }}
                    </td>

                    <td class="p-4">
                      <div class="flex justify-end gap-2">
                        <button
                          type="button"
                          @click="avaliar(usuario, STATUS_CONTA.APROVADO)"
                          class="rounded-md bg-[#006EB7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#03558c]"
                        >
                          Aprovar
                        </button>

                        <button
                          type="button"
                          @click="avaliar(usuario, STATUS_CONTA.REJEITADO)"
                          class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-red-500 transition hover:border-red-300 hover:bg-red-50"
                        >
                          Recusar
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>

              </table>

            </div>

          </section>

          <!-- TODOS OS USUÁRIOS -->

          <section
            aria-labelledby="todos-titulo"
            class="mt-8 overflow-hidden rounded-lg border border-gray-200 bg-white"
          >

            <div class="border-b border-gray-200 p-5">

              <h2
                id="todos-titulo"
                class="text-lg font-bold text-[#292A2F]"
              >
                Todos os usuários
              </h2>

              <p class="mt-1 text-sm text-gray-500">
                {{ todos.length }} cadastro(s). Um cadastro recusado pode ser aprovado depois.
              </p>

            </div>

            <div class="relative overflow-x-auto">

              <table class="w-full min-w-[820px] text-left text-sm">

                <thead class="bg-gray-50">
                  <tr>
                    <th class="p-4 font-semibold text-gray-500">Nome</th>
                    <th class="p-4 font-semibold text-gray-500">E-mail</th>
                    <th class="p-4 font-semibold text-gray-500">Papel</th>
                    <th class="p-4 font-semibold text-gray-500">Situação</th>
                    <th class="p-4 font-semibold text-gray-500">Avaliado por</th>
                    <th class="p-4 font-semibold text-gray-500">
                      <span class="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="usuario in todos"
                    :key="usuario.id"
                    class="border-t border-gray-200"
                  >
                    <td class="p-4 font-medium text-[#292A2F]">
                      {{ usuario.nome }}
                      <span
                        v-if="usuario.email === auth.email"
                        class="text-xs font-normal text-gray-500"
                      >(você)</span>
                    </td>

                    <td class="p-4 text-gray-500">
                      {{ usuario.email }}
                    </td>

                    <td class="p-4 text-gray-700">
                      {{ rotuloPapel(usuario.papel) }}
                      <span
                        v-if="usuario.papelSolicitado && usuario.papelSolicitado !== usuario.papel"
                        class="block text-xs text-gray-500"
                      >
                        pediu {{ rotuloPapel(usuario.papelSolicitado) }}
                      </span>
                    </td>

                    <td class="p-4">
                      <span
                        class="rounded-full px-3 py-1 text-xs font-semibold"
                        :class="SITUACOES[usuario.status].classe"
                      >
                        {{ SITUACOES[usuario.status].texto }}
                      </span>
                    </td>

                    <td class="p-4 text-gray-500">
                      <template v-if="usuario.avaliadoPor">
                        {{ usuario.avaliadoPor.nome }}
                        <span class="block text-xs">{{ formatarDataHora(usuario.avaliadoEm) }}</span>
                      </template>
                      <template v-else-if="usuario.status === STATUS_CONTA.APROVADO">
                        Automático (primeira conta)
                      </template>
                      <template v-else>—</template>
                    </td>

                    <td class="p-4 text-right">
                      <button
                        v-if="usuario.status === STATUS_CONTA.REJEITADO"
                        type="button"
                        @click="avaliar(usuario, STATUS_CONTA.APROVADO)"
                        class="text-sm font-medium text-[#006EB7] hover:underline"
                      >
                        Aprovar
                      </button>
                    </td>
                  </tr>
                </tbody>

              </table>

            </div>

          </section>

        </template>

      </main>

    </div>

    <AppToast
      :mensagem="aviso.mensagem"
      :tipo="aviso.tipo"
      @fechar="aviso.mensagem = ''"
    />

  </div>

</template>
