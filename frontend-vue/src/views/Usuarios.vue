<script setup>
import { computed, onMounted, ref } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import AppToast from '../components/AppToast.vue'
import { avaliarUsuario, gerarSenhaTemporaria, listarUsuarios } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { contar, formatarDataHora } from '../utils/datas'
import { PAPEIS, rotuloPapel, STATUS_CONTA } from '../utils/papeis'

// Tela do Administrador (rota protegida por "gerenciarUsuarios"):
// - aprova ou recusa os cadastros feitos em /cadastro;
// - muda o papel, bloqueia ou reativa quem já tem acesso;
// - gera uma senha temporária para quem esqueceu a sua.
// O Spring confere a sessão a cada requisição: bloquear ou trocar o papel
// vale na hora, mesmo para quem está logado.
const auth = useAuthStore()

const usuarios = ref([])
const carregando = ref(true)
const erroCarregar = ref('')
const aviso = ref({ mensagem: '', tipo: 'sucesso' })
const ocupado = ref(null)

// Papel escolhido no seletor de cada pessoa (começa com o papel atual, ou
// com o pedido, no caso dos pendentes)
const papelEscolhido = ref({})

// Senha temporária gerada: aparece uma única vez, numa janela
const senhaGerada = ref(null)
const copiada = ref(false)

const carregar = async () => {
  try {
    usuarios.value = await listarUsuarios()
    papelEscolhido.value = Object.fromEntries(usuarios.value.map(usuario => [usuario.id, usuario.papel]))
  } catch (falha) {
    erroCarregar.value = falha.message || 'Não foi possível carregar os usuários.'
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)

const maisRecentesPrimeiro = (a, b) => b.criadoEm.localeCompare(a.criadoEm)

const pendentes = computed(() => usuarios.value
  .filter(usuario => usuario.status === STATUS_CONTA.PENDENTE)
  .sort(maisRecentesPrimeiro))

// Quem já foi avaliado (os pendentes ficam só no quadro de cima)
const avaliados = computed(() => usuarios.value
  .filter(usuario => usuario.status !== STATUS_CONTA.PENDENTE)
  .sort(maisRecentesPrimeiro))

const ehVoce = usuario => usuario.email === auth.email

const SITUACOES = {
  PENDENTE: { texto: 'Aguardando', classe: 'bg-amber-50 text-amber-700' },
  APROVADO: { texto: 'Com acesso', classe: 'bg-green-50 text-green-600' },
  REJEITADO: { texto: 'Sem acesso', classe: 'bg-red-50 text-red-500' }
}

const papelMudou = usuario => papelEscolhido.value[usuario.id] !== usuario.papel

// Uma única chamada (PATCH /usuarios/{id}) para aprovar, recusar, bloquear,
// reativar ou trocar o papel
const salvar = async (usuario, status, mensagemSucesso) => {
  const papel = papelEscolhido.value[usuario.id]
  ocupado.value = usuario.id

  try {
    const atualizado = await avaliarUsuario(usuario.id, { status, papel }, auth.responsavel)
    usuarios.value = usuarios.value.map(item => (item.id === atualizado.id ? atualizado : item))
    papelEscolhido.value = { ...papelEscolhido.value, [atualizado.id]: atualizado.papel }
    auth.atualizarCadastrosPendentes()
    aviso.value = { mensagem: mensagemSucesso, tipo: 'sucesso' }
  } catch (falha) {
    aviso.value = { mensagem: falha.message || 'Não foi possível salvar. Tente novamente.', tipo: 'erro' }
  } finally {
    ocupado.value = null
  }
}

const aprovar = usuario => salvar(usuario, STATUS_CONTA.APROVADO,
  `${usuario.nome} agora tem acesso, como ${rotuloPapel(papelEscolhido.value[usuario.id])}.`)

const recusar = usuario => {
  if (!window.confirm(`Recusar o cadastro de ${usuario.nome}? A pessoa não conseguirá entrar. Você pode aprovar depois, se mudar de ideia.`)) return
  salvar(usuario, STATUS_CONTA.REJEITADO, `O cadastro de ${usuario.nome} foi recusado.`)
}

const salvarPapel = usuario => salvar(usuario, STATUS_CONTA.APROVADO,
  `${usuario.nome} agora é ${rotuloPapel(papelEscolhido.value[usuario.id])}. A mudança já vale, mesmo se a pessoa estiver logada.`)

const bloquear = usuario => {
  if (!window.confirm(`Bloquear o acesso de ${usuario.nome}? A pessoa sai do sistema na hora e não consegue mais entrar. Você pode reativar depois.`)) return
  papelEscolhido.value = { ...papelEscolhido.value, [usuario.id]: usuario.papel }
  salvar(usuario, STATUS_CONTA.REJEITADO, `O acesso de ${usuario.nome} foi bloqueado.`)
}

const reativar = usuario => salvar(usuario, STATUS_CONTA.APROVADO,
  `${usuario.nome} voltou a ter acesso, como ${rotuloPapel(papelEscolhido.value[usuario.id])}.`)

const gerarSenha = async usuario => {
  if (!window.confirm(`Gerar uma senha temporária para ${usuario.nome}? A senha atual dessa pessoa deixa de funcionar.`)) return
  ocupado.value = usuario.id
  try {
    const senha = await gerarSenhaTemporaria(usuario.id)
    copiada.value = false
    senhaGerada.value = { nome: usuario.nome, email: usuario.email, senha }
  } catch (falha) {
    aviso.value = { mensagem: falha.message || 'Não foi possível gerar a senha. Tente novamente.', tipo: 'erro' }
  } finally {
    ocupado.value = null
  }
}

const copiarSenha = async () => {
  try {
    await navigator.clipboard.writeText(senhaGerada.value.senha)
    copiada.value = true
  } catch {
    copiada.value = false
  }
}

const avaliadoPor = usuario => {
  if (usuario.avaliadoPor) return `${usuario.avaliadoPor.nome} · ${formatarDataHora(usuario.avaliadoEm)}`
  if (usuario.status === STATUS_CONTA.APROVADO) return 'automático (primeira conta)'
  return '—'
}

const classeSelect = 'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-cti-azul disabled:opacity-60'
const classeBotao = 'rounded-md border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50'
</script>

<template>

  <div class="flex min-h-screen flex-col sm:flex-row">

    <Sidebar />

    <div class="grid-background min-w-0 flex-1">

      <main class="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">

        <header>
          <h1 class="text-3xl font-bold text-cti-grafite">
            Usuários
          </h1>
          <p class="mt-2 text-sm text-gray-500">
            Aprove cadastros, defina o papel de cada pessoa, bloqueie quem não deve mais entrar e gere uma
            senha temporária para quem esqueceu a sua.
          </p>
        </header>

        <p v-if="carregando" class="text-sm text-gray-500">Carregando usuários...</p>
        <p v-else-if="erroCarregar" role="alert" class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {{ erroCarregar }}
        </p>

        <template v-else>

          <!-- AGUARDANDO APROVAÇÃO -->

          <section aria-labelledby="pendentes-titulo" class="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div class="border-b border-gray-200 p-5">
              <h2 id="pendentes-titulo" class="flex items-center gap-2 text-lg font-bold text-cti-grafite">
                Aguardando aprovação
                <span class="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">{{ pendentes.length }}</span>
              </h2>
              <p class="mt-1 text-sm text-gray-500">
                Confira o papel pedido; se precisar, troque antes de aprovar.
              </p>
            </div>

            <p v-if="!pendentes.length" class="p-5 text-sm text-gray-500">
              Nenhum cadastro aguardando aprovação.
            </p>

            <ul v-else class="divide-y divide-gray-100">
              <li
                v-for="usuario in pendentes"
                :key="usuario.id"
                class="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div class="min-w-0">
                  <p class="font-semibold text-cti-grafite">{{ usuario.nome }}</p>
                  <p class="break-all text-sm text-gray-500">{{ usuario.email }}</p>
                  <p class="mt-0.5 text-xs text-gray-400">Cadastrado em {{ formatarDataHora(usuario.criadoEm) }}</p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <label class="sr-only" :for="`papel-${usuario.id}`">Papel de {{ usuario.nome }}</label>
                  <select :id="`papel-${usuario.id}`" v-model="papelEscolhido[usuario.id]" :class="classeSelect">
                    <option v-for="papel in PAPEIS" :key="papel.valor" :value="papel.valor">
                      {{ papel.rotulo }}{{ papel.valor === usuario.papelSolicitado ? ' (pedido)' : '' }}
                    </option>
                  </select>

                  <button
                    type="button"
                    :disabled="ocupado === usuario.id"
                    class="rounded-md bg-cti-azul px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cti-azul-escuro disabled:opacity-50"
                    @click="aprovar(usuario)"
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    :disabled="ocupado === usuario.id"
                    class="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                    @click="recusar(usuario)"
                  >
                    Recusar
                  </button>
                </div>
              </li>
            </ul>
          </section>

          <!-- QUEM JÁ FOI AVALIADO -->

          <section aria-labelledby="todos-titulo" class="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div class="border-b border-gray-200 p-5">
              <h2 id="todos-titulo" class="text-lg font-bold text-cti-grafite">
                Equipe com cadastro avaliado
              </h2>
              <p class="mt-1 text-sm text-gray-500">
                {{ contar(avaliados.length, 'pessoa', 'pessoas') }}. Mudar o papel ou bloquear vale na hora, mesmo para quem
                está logado.
              </p>
            </div>

            <ul class="divide-y divide-gray-100">
              <li
                v-for="usuario in avaliados"
                :key="usuario.id"
                class="grid grid-cols-1 gap-3 p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.6fr)] lg:items-center"
              >
                <!-- Quem é -->
                <div class="min-w-0">
                  <p class="font-semibold text-cti-grafite">
                    {{ usuario.nome }}
                    <span v-if="ehVoce(usuario)" class="text-xs font-normal text-gray-500">(você)</span>
                  </p>
                  <p class="break-all text-sm text-gray-500">{{ usuario.email }}</p>
                  <p class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span class="rounded-full px-2.5 py-0.5 font-semibold" :class="SITUACOES[usuario.status].classe">
                      {{ SITUACOES[usuario.status].texto }}
                    </span>
                    <span>Avaliado por {{ avaliadoPor(usuario) }}</span>
                  </p>
                </div>

                <!-- Papel -->
                <div>
                  <template v-if="ehVoce(usuario)">
                    <p class="text-sm text-gray-700">{{ rotuloPapel(usuario.papel) }}</p>
                    <p class="text-xs text-gray-400">O seu próprio papel não pode ser alterado aqui.</p>
                  </template>
                  <template v-else>
                    <label class="sr-only" :for="`papel-${usuario.id}`">Papel de {{ usuario.nome }}</label>
                    <select
                      :id="`papel-${usuario.id}`"
                      v-model="papelEscolhido[usuario.id]"
                      :disabled="ocupado === usuario.id"
                      :class="classeSelect"
                    >
                      <option v-for="papel in PAPEIS" :key="papel.valor" :value="papel.valor">{{ papel.rotulo }}</option>
                    </select>
                  </template>
                </div>

                <!-- Ações (nunca na própria conta) -->
                <div v-if="!ehVoce(usuario)" class="flex flex-wrap gap-2 lg:justify-end">
                  <template v-if="usuario.status === STATUS_CONTA.APROVADO">
                    <button
                      v-if="papelMudou(usuario)"
                      type="button"
                      :disabled="ocupado === usuario.id"
                      :class="[classeBotao, 'border-cti-azul bg-cti-azul text-white hover:bg-cti-azul-escuro']"
                      @click="salvarPapel(usuario)"
                    >
                      Salvar papel
                    </button>
                    <button
                      type="button"
                      :disabled="ocupado === usuario.id"
                      :class="[classeBotao, 'border-gray-300 bg-white text-gray-700 hover:border-cti-azul hover:text-cti-azul']"
                      @click="gerarSenha(usuario)"
                    >
                      Gerar senha temporária
                    </button>
                    <button
                      type="button"
                      :disabled="ocupado === usuario.id"
                      :class="[classeBotao, 'border-red-200 bg-white text-red-500 hover:bg-red-50']"
                      @click="bloquear(usuario)"
                    >
                      Bloquear acesso
                    </button>
                  </template>

                  <button
                    v-else
                    type="button"
                    :disabled="ocupado === usuario.id"
                    :class="[classeBotao, 'border-cti-azul bg-white text-cti-azul hover:bg-blue-50']"
                    @click="reativar(usuario)"
                  >
                    Dar acesso como {{ rotuloPapel(papelEscolhido[usuario.id]) }}
                  </button>
                </div>
              </li>
            </ul>
          </section>

        </template>

      </main>

    </div>

    <!-- Senha temporária: mostrada uma única vez -->
    <div
      v-if="senhaGerada"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="senha-titulo"
        class="w-full max-w-md rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl"
      >
        <h2 id="senha-titulo" class="text-lg font-bold text-cti-grafite">Senha temporária gerada</h2>
        <p class="mt-1 text-sm text-gray-500">
          Para <span class="font-semibold text-cti-grafite">{{ senhaGerada.nome }}</span> ({{ senhaGerada.email }})
        </p>

        <p class="mt-5 select-all rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-center font-['IBM_Plex_Mono'] text-xl tracking-wider text-cti-grafite">
          {{ senhaGerada.senha }}
        </p>

        <ul class="mt-4 space-y-1.5 text-sm text-gray-600">
          <li>• Entregue a senha pessoalmente ou por um canal seguro.</li>
          <li>• No primeiro acesso com ela, a pessoa cria uma senha nova.</li>
          <li>• <strong>Esta senha não aparece de novo.</strong> Se perder, gere outra.</li>
        </ul>

        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            @click="senhaGerada = null"
          >
            Fechar
          </button>
          <button
            type="button"
            class="rounded-md bg-cti-azul px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cti-azul-escuro"
            @click="copiarSenha"
          >
            {{ copiada ? 'Copiada ✓' : 'Copiar senha' }}
          </button>
        </div>
      </section>
    </div>

    <AppToast
      :mensagem="aviso.mensagem"
      :tipo="aviso.tipo"
      @fechar="aviso.mensagem = ''"
    />

  </div>

</template>
