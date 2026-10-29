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

import { STATUS_CONTA } from '../utils/papeis'

const USAR_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

const CHAVE_AUTH = 'ctiAuth'
const CHAVE_USUARIO = 'ctiUsuario'
const CHAVE_NOME = 'ctiNome'
const CHAVE_PAPEL = 'ctiPapel'
const CHAVE_CLIENTES = 'ctiClientes'
const CHAVE_TELEMETRIA = 'ctiTelemetria'
const CHAVE_CONTAS = 'ctiContas'

// ---------- Utilitários ----------

const lerJson = (chave, padrao) => {
  const salvo = localStorage.getItem(chave)
  return salvo ? JSON.parse(salvo) : padrao
}

// Erro com o status HTTP (e um código, quando houver), para a tela saber o
// que aconteceu: 401 = senha errada, 403 + PENDENTE/REJEITADO = cadastro
// não aprovado, 409 = e-mail já cadastrado.
const erroComStatus = (mensagem, status, codigo = '') => Object.assign(new Error(mensagem), { status, codigo })

const http = async (caminho, opcoes = {}) => {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes
  })

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({}))
    throw erroComStatus(`Erro ${resposta.status} em ${caminho}`, resposta.status, corpo.codigo)
  }

  return resposta.status === 204 ? null : resposta.json()
}

// ---------- Sessão ----------

// Síncronas de propósito: a guarda de rota e a Sidebar precisam da resposta
// na hora. No modo API, troque por token/cookie de sessão.
// Sessão sem papel (de antes dos papéis existirem) não vale: entra de novo.
export const estaAutenticado = () => {
  return localStorage.getItem(CHAVE_AUTH) === 'true' && Boolean(papelUsuario())
}

export const usuarioAtual = () => {
  return localStorage.getItem(CHAVE_USUARIO) || ''
}

// ANALISTA, GESTOR ou ADMINISTRADOR (veja utils/papeis.js)
export const papelUsuario = () => {
  return localStorage.getItem(CHAVE_PAPEL) || ''
}

const salvarSessao = usuario => {
  localStorage.setItem(CHAVE_AUTH, 'true')
  localStorage.setItem(CHAVE_USUARIO, usuario.email)
  localStorage.setItem(CHAVE_PAPEL, usuario.papel)

  if (usuario.nome) {
    localStorage.setItem(CHAVE_NOME, usuario.nome)
  } else {
    localStorage.removeItem(CHAVE_NOME)
  }
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

// API: POST /auth/login  { email, senha } -> { email, nome?, papel }
// (403 com { codigo: "PENDENTE" | "REJEITADO" } se o cadastro não foi aprovado)
export const login = async (email, senha) => {
  if (!USAR_MOCK) {
    const usuario = await http('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha })
    })
    salvarSessao(usuario)
    return usuario
  }

  // Mock: só entra quem se cadastrou neste navegador (tela /cadastro)
  // e já foi aprovado por um Administrador (tela /usuarios)
  const conta = lerContas().find(item => item.email === normalizarEmail(email))

  if (!conta || conta.senha !== await resumoSenha(senha)) {
    throw erroComStatus('E-mail ou senha inválidos', 401)
  }

  if (conta.status !== STATUS_CONTA.APROVADO) {
    throw erroComStatus('Cadastro não aprovado', 403, conta.status)
  }

  const usuario = semSenha(conta)
  salvarSessao(usuario)
  return usuario
}

// ---------- Cadastro (primeiro acesso) e aprovação ----------

const lerContas = () => lerJson(CHAVE_CONTAS, [])
const salvarContas = contas => localStorage.setItem(CHAVE_CONTAS, JSON.stringify(contas))

// O que sai do serviço nunca leva a senha
const semSenha = conta => {
  const copia = { ...conta }
  delete copia.senha
  return copia
}

const normalizarEmail = email => String(email || '').trim().toLowerCase()

// Mock: a senha não fica em texto puro no localStorage, e sim o SHA-256
// dela. Na API real quem guarda a senha é o back-end (com BCrypt).
// crypto.subtle só existe em https ou localhost; fora disso (ex.: abrir o
// npm run dev pelo IP da rede) cai para o texto puro, só no mock.
const resumoSenha = async senha => {
  if (!globalThis.crypto?.subtle) {
    return senha
  }

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(senha))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

// API: POST /auth/cadastro  { nome, email, senha, papel }
//   -> { id, nome, email, papel, status }   (409 se o e-mail já tiver cadastro)
// O cadastro nasce PENDENTE: só entra depois que um Administrador aprovar.
// Exceção: a primeira conta do sistema vira Administrador já aprovada —
// senão não haveria ninguém para aprovar os outros.
export const cadastrar = async (nome, email, senha, papel) => {
  if (!USAR_MOCK) {
    return http('/auth/cadastro', {
      method: 'POST',
      body: JSON.stringify({ nome, email, senha, papel })
    })
  }

  const contas = lerContas()
  const emailNormalizado = normalizarEmail(email)

  if (contas.some(item => item.email === emailNormalizado)) {
    throw erroComStatus('E-mail já cadastrado', 409)
  }

  const primeiraConta = contas.length === 0

  const conta = {
    id: Date.now(),
    nome: nome.trim(),
    email: emailNormalizado,
    senha: await resumoSenha(senha),
    papel: primeiraConta ? 'ADMINISTRADOR' : papel,
    papelSolicitado: papel,
    status: primeiraConta ? STATUS_CONTA.APROVADO : STATUS_CONTA.PENDENTE,
    criadoEm: new Date().toISOString(),
    avaliadoEm: null,
    avaliadoPor: null
  }

  salvarContas([...contas, conta])
  return semSenha(conta)
}

// API: GET /usuarios -> [Usuario]  (só Administrador)
export const listarUsuarios = async () => {
  if (!USAR_MOCK) {
    return http('/usuarios')
  }

  return lerContas().map(semSenha)
}

// Aprovar ou recusar um cadastro; o Administrador pode trocar o papel
// pedido antes de aprovar.
// API: PATCH /usuarios/{id}  { status, papel } -> Usuario  (só Administrador)
export const avaliarUsuario = async (id, { status, papel }, avaliadoPor) => {
  if (!USAR_MOCK) {
    return http(`/usuarios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, papel })
    })
  }

  let atualizada = null

  const contas = lerContas().map(conta => {
    if (conta.id !== id) {
      return conta
    }

    atualizada = { ...conta, status, papel, avaliadoEm: new Date().toISOString(), avaliadoPor }
    return atualizada
  })

  if (!atualizada) {
    throw erroComStatus('Usuário não encontrado', 404)
  }

  salvarContas(contas)
  return semSenha(atualizada)
}

// API: POST /auth/logout
export const logout = async () => {
  localStorage.removeItem(CHAVE_AUTH)
  localStorage.removeItem(CHAVE_USUARIO)
  localStorage.removeItem(CHAVE_NOME)
  localStorage.removeItem(CHAVE_PAPEL)

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
