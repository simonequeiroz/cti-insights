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

// API: POST /auth/login  { email, senha } -> { email }
export const login = async (email, senha) => {
  if (!USAR_MOCK) {
    const usuario = await http('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha })
    })
    localStorage.setItem(CHAVE_AUTH, 'true')
    localStorage.setItem(CHAVE_USUARIO, usuario.email)
    return usuario
  }

  // Mock: qualquer e-mail/senha "autenticam".
  localStorage.setItem(CHAVE_AUTH, 'true')
  localStorage.setItem(CHAVE_USUARIO, email)
  return { email }
}

// API: POST /auth/logout
export const logout = async () => {
  localStorage.removeItem(CHAVE_AUTH)
  localStorage.removeItem(CHAVE_USUARIO)

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

// ---------- Limpeza ----------

// Ferramenta de teste (botão "Limpar dados locais" em Relatórios).
// API: DELETE /clientes e DELETE /uploads, se o back-end oferecer isso.
export const limparDados = async () => {
  localStorage.removeItem(CHAVE_CLIENTES)
  localStorage.removeItem(CHAVE_TELEMETRIA)
}
