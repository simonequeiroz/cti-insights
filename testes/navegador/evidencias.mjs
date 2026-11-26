// Tira os prints da entrega final (sistema real, API ligada). Não grava nada no banco:
// a importação para na etapa de confirmação e o formulário de edição é cancelado.
import { chromium } from 'playwright-core'
import { ARQUIVOS, CHROME, ENV_JAVA, PLANILHA_PROFESSOR, RAIZ } from './config.mjs'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(ENV_JAVA, 'utf8')
  .split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const OUT = process.argv[2] || `${RAIZ}/evidencias/entrega-final`
const B = 'http://localhost:5173'
const DESK = { width: 1366, height: 900 }
const CEL = { width: 390, height: 844 }

const b = await chromium.launch({ executablePath: CHROME })
const ctx = await b.newContext({ viewport: DESK })
const p = await ctx.newPage()
const shot = async (nome, { full = true, espera = 1200 } = {}) => {
  await p.waitForTimeout(espera)
  await p.evaluate(() => window.scrollTo(0, 0))
  await p.screenshot({ path: `${OUT}/${nome}.png`, fullPage: full })
  console.log('ok', nome)
}

// Públicas
await p.goto(B + '/'); await shot('01-home-desktop', { espera: 3500 })
await p.setViewportSize(CEL); await p.goto(B + '/'); await shot('02-home-celular', { espera: 3500 })
await p.goto(B + '/login'); await shot('03-login-celular', { full: false })
await p.setViewportSize(DESK)
await p.goto(B + '/login'); await shot('04-login-desktop', { full: false })

// Login: servidor fora do ar (API bloqueada só neste print)
await p.route('**/api/**', r => r.abort('connectionrefused'))
await p.locator('input[type=email]').fill(env.ADMIN_EMAIL)
await p.locator('input[type=password]').fill('senha-qualquer')
await p.locator('button[type=submit]').click()
await p.getByRole('alert').waitFor()
await shot('05-login-servidor-fora-do-ar', { full: false, espera: 300 })
await p.unroute('**/api/**')

await p.goto(B + '/login?redirect=%2Fdashboard&motivo=sessao'); await shot('06-login-sessao-expirada', { full: false })
await p.goto(B + '/cadastro'); await shot('07-cadastro', { full: false })

// Login real
await p.goto(B + '/login')
await p.locator('input[type=email]').fill(env.ADMIN_EMAIL)
await p.locator('input[type=password]').fill(env.ADMIN_PASSWORD)
await p.locator('button[type=submit]').click()
await p.waitForURL('**/dashboard')
await p.getByText('Faturamento Total', { exact: true }).waitFor()
await shot('08-dashboard-desktop', { espera: 2000 })
await p.setViewportSize(CEL); await p.reload(); await p.getByText('Faturamento Total', { exact: true }).waitFor()
await shot('09-dashboard-celular', { espera: 2000 })
await p.getByRole('button', { name: /abrir menu/i }).click().catch(() => {})
await shot('10-menu-celular', { full: false, espera: 600 })
await p.setViewportSize(DESK)

// Importação (para antes de gravar)
await p.goto(B + '/upload'); await shot('11-importar-enviar')
await p.locator('input[type=file]').setInputFiles(`${ARQUIVOS}/carteira-cliente.csv`)
await p.getByRole('button', { name: 'Verificar planilha' }).click()
await shot('12-importar-revisar')
await p.getByRole('button', { name: /continuar/i }).first().click()
await shot('13-importar-confirmar')

// Relatórios e edição (cancelada)
await p.goto(B + '/relatorios'); await p.getByRole('heading', { name: 'Carteira atual' }).waitFor()
await shot('14-clientes')
await p.getByRole('button', { name: /^Editar / }).first().click()
await shot('15-editar-cliente', { full: false, espera: 600 })
await p.getByRole('button', { name: 'Cancelar' }).click()
await p.getByRole('button', { name: '+ Novo cliente' }).click()
await p.getByRole('button', { name: 'Incluir cliente' }).click()
await shot('16-novo-cliente-validacao', { full: false, espera: 600 })
await p.getByRole('button', { name: 'Cancelar' }).click()

await p.goto(B + '/usuarios'); await shot('17-usuarios')

await b.close()
