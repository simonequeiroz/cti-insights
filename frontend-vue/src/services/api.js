// Camada de acesso a dados do front-end.
//
// Toda leitura/gravação de dados e de sessão passa por aqui — nenhuma tela
// ou store deve tocar em localStorage nem chamar fetch diretamente. Assim,
// ligar o back-end (Spring Boot) é trocar o corpo destas funções, sem mexer
// nas telas.
//
// Modo mock (padrão): guarda tudo no localStorage deste navegador.
// Modo API: defina VITE_USE_MOCK=false e VITE_API_URL no arquivo .env
// (veja .env.example). Os endpoints usados estão em API-CONTRATO.md e são
// uma PROPOSTA a validar com a squad de Java — ainda não foram testados
// contra um back-end real.

const USAR_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

const CHAVE_AUTH = 'ctiAuth'
const CHAVE_USUARIO = 'ctiUsuario'
const CHAVE_NOME = 'ctiNome'
const CHAVE_CLIENTES = 'ctiClientes'
const CHAVE_TELEMETRIA = 'ctiTelemetria'

// ---------- Utilitários ----------

const lerJson = (chave, padrao) => {
  const salvo = localStorage.getItem(chave)
  return salvo ? JSON.parse(salvo) : padrao
}

const http = async (caminho, opcoes = {}) => {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes
  })

  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} em ${caminho}`)
  }

  return resposta.status === 204 ? null : resposta.json()
}

// ---------- Sessão ----------

// Síncronas de propósito: a guarda de rota e a Sidebar precisam da resposta
// na hora. No modo API, troque por token/cookie de sessão.
export const estaAutenticado = () => {
  return localStorage.getItem(CHAVE_AUTH) === 'true'
}

export const usuarioAtual = () => {
  return localStorage.getItem(CHAVE_USUARIO) || ''
}

// Nome para exibir na Sidebar. Vem da API quando ela informa (campo "nome"
// do login). Sem isso — no mock, ou se a API só devolver o e-mail — deriva
// do e-mail: "ana.lima@empresa.com" -> "Ana Lima".
const nomeAPartirDoEmail = email => {
  return String(email || '')
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
    .join(' ')
}

export const nomeUsuario = () => {
  return localStorage.getItem(CHAVE_NOME) || nomeAPartirDoEmail(usuarioAtual())
}

// API: POST /auth/login  { email, senha } -> { email, nome? }
export const login = async (email, senha) => {
  if (!USAR_MOCK) {
    const usuario = await http('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha })
    })
    localStorage.setItem(CHAVE_AUTH, 'true')
    localStorage.setItem(CHAVE_USUARIO, usuario.email)

    if (usuario.nome) {
      localStorage.setItem(CHAVE_NOME, usuario.nome)
    }

    return usuario
  }

  // Mock: qualquer e-mail/senha "autenticam".
  localStorage.setItem(CHAVE_AUTH, 'true')
  localStorage.setItem(CHAVE_USUARIO, email)
  localStorage.removeItem(CHAVE_NOME)
  return { email }
}

// API: POST /auth/logout
export const logout = async () => {
  localStorage.removeItem(CHAVE_AUTH)
  localStorage.removeItem(CHAVE_USUARIO)
  localStorage.removeItem(CHAVE_NOME)

  if (!USAR_MOCK) {
    await http('/auth/logout', { method: 'POST' })
  }
}

// ---------- Clientes ----------

// API: GET /clientes -> [Cliente]
export const listarClientes = async () => {
  if (!USAR_MOCK) {
    return http('/clientes')
  }

  return lerJson(CHAVE_CLIENTES, [])
}

// Mock: o front trata a planilha e guarda o resultado aqui.
// API: a base é gravada pelo back-end ao receber a planilha
// (POST /uploads); esta função deixa de ser necessária.
export const salvarClientes = async clientes => {
  if (!USAR_MOCK) {
    return
  }

  localStorage.setItem(CHAVE_CLIENTES, JSON.stringify(clientes))
}

// ---------- Histórico de processamento (telemetria) ----------

// API: GET /uploads -> [RegistroUpload]
export const listarHistorico = async () => {
  if (!USAR_MOCK) {
    return http('/uploads')
  }

  return lerJson(CHAVE_TELEMETRIA, [])
}

// Mesmo caso de salvarClientes: só existe no modo mock.
export const salvarHistorico = async historico => {
  if (!USAR_MOCK) {
    return
  }

  localStorage.setItem(CHAVE_TELEMETRIA, JSON.stringify(historico))
}

// ---------- Apoio a testes ----------

// Só em desenvolvimento (npm run dev): se a chave ctiDelayUpload do
// localStorage tiver um número (milissegundos), o processamento do upload
// espera esse tempo, para dar para ver o status PROCESSANDO na tela. Em
// produção (npm run build) não faz nada. Para usar, no console do navegador:
//   localStorage.setItem('ctiDelayUpload', 3000)
// e para desligar: localStorage.removeItem('ctiDelayUpload')
export const esperarSimulado = async () => {
  if (!import.meta.env.DEV) {
    return
  }

  const atraso = Number(localStorage.getItem('ctiDelayUpload'))

  if (atraso > 0) {
    await new Promise(resolver => setTimeout(resolver, atraso))
  }
}

// ---------- Limpeza ----------

// Ferramenta de teste (botão "Limpar dados locais" em Relatórios).
// API: DELETE /clientes e DELETE /uploads, se o back-end oferecer isso.
export const limparDados = async () => {
  localStorage.removeItem(CHAVE_CLIENTES)
  localStorage.removeItem(CHAVE_TELEMETRIA)
}
