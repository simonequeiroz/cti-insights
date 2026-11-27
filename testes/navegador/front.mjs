// Testa o front no Chrome: erros amigáveis, login real, dashboard e logout.
// Lê as credenciais do backend-java/.env sem imprimir.
import { chromium } from 'playwright-core'
import { ARQUIVOS, CHROME, ENV_JAVA, PLANILHA_PROFESSOR, RAIZ } from './config.mjs'
import { readFileSync, mkdirSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(ENV_JAVA, 'utf8')
  .split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const EMAIL = env.ADMIN_EMAIL, SENHA = env.ADMIN_PASSWORD
const BASE = 'http://localhost:5173'
const PRINTS = process.argv[2] || `${RAIZ}/testes/navegador/saida`
mkdirSync(PRINTS, { recursive: true })

let ok = 0, falha = 0
const confere = (nome, passou, detalhe = '') => { passou ? ok++ : falha++; console.log(`[${passou ? 'OK   ' : 'FALHA'}] ${nome} ${detalhe}`) }

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } })
const page = await ctx.newPage()
const errosConsole = []
page.on('pageerror', e => errosConsole.push(e.message))

const erroLogin = async () => {
  const el = page.locator('p, div').filter({ hasText: /inválid|servidor|conexão|aprova/i }).last()
  await el.waitFor({ timeout: 8000 })
  return (await el.innerText()).trim()
}
const preencherLogin = async (email, senha) => {
  await page.goto(BASE + '/login')
  await page.locator('input[type=email]').fill(email)
  await page.locator('input[type=password]').fill(senha)
  await page.locator('button[type=submit]').click()
}

// 1) Servidor fora do ar: a API é bloqueada de propósito
await page.route('**/api/**', r => r.abort('connectionrefused'))
await preencherLogin(EMAIL, 'qualquer')
const msgFora = await erroLogin()
confere('servidor fora do ar mostra mensagem amigável', /falar com o servidor/.test(msgFora), `-> "${msgFora}"`)
await page.unroute('**/api/**')

// 2) Senha errada
await preencherLogin(EMAIL, 'senha-errada-123')
const msgSenha = await erroLogin()
confere('senha errada mostra "E-mail ou senha inválidos."', /inválidos/.test(msgSenha), `-> "${msgSenha}"`)

// 3) Login real
await preencherLogin(EMAIL, SENHA)
await page.waitForURL('**/dashboard', { timeout: 15000 })
confere('login leva ao dashboard', page.url().endsWith('/dashboard'))
await page.getByText('Faturamento Total', { exact: true }).waitFor({ timeout: 15000 })
const cards = await page.locator('p.text-xs.text-gray-500').allInnerTexts()
confere('4 cartões de indicador (CardIndicador)', ['Faturamento Total', 'Clientes na base', 'Serviços Contratados', 'Ticket Médio'].every(t => cards.includes(t)), JSON.stringify(cards.slice(0, 4)))
const canvases = await page.locator('canvas').count()
confere('3 gráficos Chart.js desenhados (Top 5 é em HTML)', canvases >= 3, `${canvases} canvas`)
await page.waitForTimeout(1500)
await page.screenshot({ path: `${PRINTS}/dashboard-desktop.png`, fullPage: true })

await page.goto(BASE + '/upload')
await page.waitForTimeout(1500)
await page.screenshot({ path: `${PRINTS}/upload-desktop.png`, fullPage: true })

// 4) Celular (390 px)
await page.setViewportSize({ width: 390, height: 844 })
await page.goto(BASE + '/dashboard')
await page.getByText('Faturamento Total', { exact: true }).waitFor({ timeout: 15000 })
await page.waitForTimeout(1500)
const largura = await page.evaluate(() => document.documentElement.scrollWidth)
confere('sem rolagem lateral no celular', largura <= 392, `scrollWidth=${largura}`)
await page.screenshot({ path: `${PRINTS}/dashboard-celular.png`, fullPage: true })
await page.goto(BASE + '/upload')
await page.waitForTimeout(1500)
await page.screenshot({ path: `${PRINTS}/upload-celular.png`, fullPage: true })

// 5) Logout (POST com CSRF pelo axios)
await page.setViewportSize({ width: 1366, height: 900 })
await page.goto(BASE + '/dashboard')
const sair = page.getByRole('button', { name: 'Sair do sistema' }).first()
await sair.click()
await page.waitForURL(u => !u.pathname.startsWith('/dashboard'), { timeout: 10000 })
const st = await page.evaluate(async () => (await fetch('/api/dashboard')).status)
confere('logout encerra a sessão no Spring', st === 401 || st === 403, `GET /api/dashboard -> ${st}`)

confere('sem erros de JavaScript na página', errosConsole.length === 0, errosConsole.join(' | '))
await browser.close()
console.log(`\nResumo: ${ok} OK, ${falha} FALHA`)
process.exit(falha ? 1 : 0)
