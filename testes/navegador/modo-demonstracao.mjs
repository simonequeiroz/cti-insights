// Modo demonstração (VITE_USE_MOCK=true, porta 5199): sem Java, Python nem banco
import { chromium } from 'playwright-core'
import { ARQUIVOS, CHROME, ENV_JAVA, PLANILHA_PROFESSOR, RAIZ } from './config.mjs'
const out = process.argv[2] || `${RAIZ}/testes/navegador/saida`, B = 'http://localhost:5199'
let ok = 0, falha = 0
const confere = (n, c, d = '') => { c ? ok++ : falha++; console.log(`[${c ? 'OK   ' : 'FALHA'}] ${n} ${d}`) }
const b = await chromium.launch({ executablePath: CHROME })
const p = await b.newPage({ viewport: { width: 1366, height: 900 } })
const erros = []; p.on('pageerror', e => erros.push(e.message))
const chamadasApi = []; p.on('request', r => { if (r.url().includes('/api/')) chamadasApi.push(r.url()) })
p.on('dialog', d => d.accept())

await p.goto(B + '/login'); await p.waitForTimeout(800)
confere('login mostra a conta de demonstração', await p.getByRole('button', { name: /conta de demonstração/ }).count() === 1)
await p.getByRole('button', { name: /conta de demonstração/ }).click()
await p.waitForURL('**/dashboard', { timeout: 10000 })
confere('entra com a conta de demonstração', p.url().endsWith('/dashboard'))

await p.goto(B + '/upload'); await p.waitForTimeout(800)
await p.locator('input[type=file]').setInputFiles(PLANILHA_PROFESSOR)
await p.getByRole('button', { name: 'Verificar planilha' }).click(); await p.waitForTimeout(1500)
const rev = await p.locator('main').innerText()
confere('revisão da planilha do professor (32 prontas, 4 com erro)', /Prontas para importar\s+32/.test(rev) && /Com erro\s+4/.test(rev))
await p.getByRole('button', { name: /continuar/i }).first().click(); await p.waitForTimeout(500)
await p.getByRole('button', { name: /^(Re)?[Ii]mportar \d+ clientes/ }).click(); await p.waitForTimeout(1500)
confere('importação concluída', await p.getByRole('heading', { name: /clientes importados/ }).count() === 1)

await p.goto(B + '/dashboard'); await p.waitForTimeout(2000)
const dash = (await p.locator('main').innerText()).replace(/\s+/g, ' ')
confere('dashboard com os 32 clientes', /Clientes na base 32/.test(dash))
confere('dashboard com insights', /Insights Inteligentes/.test(dash) && (await p.locator('canvas').count()) >= 3)
await p.screenshot({ path: `${out}/mock-dashboard.png`, fullPage: true })

await p.goto(B + '/relatorios'); await p.getByRole('heading', { name: 'Carteira atual' }).waitFor()
await p.getByRole('button', { name: /^Editar / }).first().click()
await p.getByRole('spinbutton', { name: 'Faturamento anual (R$)' }).fill('999999')
await p.getByRole('button', { name: 'Salvar alterações' }).click(); await p.waitForTimeout(800)
confere('edição de cliente no modo demonstração', /foi atualizado/.test(await p.locator('[role=status]').last().innerText()))

await p.getByRole('button', { name: 'Sair do sistema' }).click(); await p.waitForURL('**/login')
confere('sair volta ao login', p.url().includes('/login'))
confere('nenhuma chamada à API (tudo no navegador)', chamadasApi.length === 0, chamadasApi.slice(0, 3).join(' '))
confere('sem erros de JavaScript', erros.length === 0, erros.join(' | '))
await b.close(); console.log(`\nResumo: ${ok} OK, ${falha} FALHA`)
