import { chromium } from 'playwright-core'
import { ARQUIVOS, CHROME, ENV_JAVA, PLANILHA_PROFESSOR, RAIZ } from './config.mjs'
const out = process.argv[2] || `${RAIZ}/testes/navegador/saida`
let ok = 0, falha = 0
const confere = (n, passou, d = '') => { passou ? ok++ : falha++; console.log(`[${passou ? 'OK   ' : 'FALHA'}] ${n} ${d}`) }
const b = await chromium.launch({ executablePath:CHROME })
const nova = async () => { const p = await b.newPage({ viewport:{ width:390, height:844 } }); return p }
const B = 'http://localhost:5173'
const preencher = async p => { await p.locator('input[type=email]').fill('teste@empresa.com'); await p.locator('input[type=password]').fill('qualquer123') }

// 1) login lento
let p = await nova()
await p.route('**/api/auth/login', async r => { await new Promise(s => setTimeout(s, 3000)); await r.continue() })
await p.goto(B + '/login'); await preencher(p)
await p.locator('button[type=submit]').click(); await p.waitForTimeout(600)
const btn = p.locator('button[type=submit]')
confere('botão mostra "Entrando..." e fica desabilitado', (await btn.innerText()).includes('Entrando') && await btn.isDisabled(), `"${(await btn.innerText()).trim()}"`)
await p.screenshot({ path: `${out}/login-entrando.png` })
await p.getByRole('alert').waitFor({ timeout: 8000 })
confere('depois da resposta, o botão volta e o erro aparece', !(await btn.isDisabled()) && /inválidos/.test(await p.getByRole('alert').innerText()))
await p.screenshot({ path: `${out}/login-erro-celular.png` })
await p.close()

// 2) sessão expirada
p = await nova()
await p.goto(B + '/login?redirect=%2Frelatorios&motivo=sessao'); await p.waitForTimeout(500)
confere('aviso de sessão expirada aparece', await p.getByText(/sessão foi encerrada/).count() === 1)
await p.screenshot({ path: `${out}/login-sessao-expirada.png` })
await p.goto(B + '/login'); await p.waitForTimeout(300)
confere('sem o motivo, o aviso não aparece', await p.getByText(/sessão foi encerrada/).count() === 0)
await p.close()

// 3) redirect: login aprovado simulado
const loginAprovado = async (redirect) => {
  const pg = await nova()
  await pg.route('**/api/auth/login', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email: 'teste@empresa.com', nome: 'Teste', papel: 'ADMINISTRADOR' }) }))
  await pg.route('**/api/**', (r) => r.request().url().includes('/auth/') ? r.fallback() : r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await pg.goto(B + '/login?redirect=' + encodeURIComponent(redirect)); await preencher(pg)
  await pg.locator('button[type=submit]').click(); await pg.waitForTimeout(1500)
  const u = new URL(pg.url()); await pg.close(); return u
}
for (const r of ['https://site-falso.com', '//site-falso.com', String.fromCharCode(47, 92) + 'site-falso.com', 'javascript:alert(1)']) {
  const u = await loginAprovado(r)
  confere(`redirect "${r}" vai ao Dashboard`, u.host === 'localhost:5173' && u.pathname === '/dashboard', u.href)
}
const u = await loginAprovado('/relatorios')
confere('redirect interno "/relatorios" continua funcionando', u.pathname === '/relatorios', u.href)

// 3b) endereço inexistente
p = await nova(); await p.goto(B + '/pagina-que-nao-existe'); await p.waitForTimeout(800)
confere('endereço inexistente volta à página inicial', new URL(p.url()).pathname === '/' && await p.locator('h1').count() > 0, p.url())
await p.close()

// 4) celular: cartão logo abaixo do topo
p = await nova(); await p.goto(B + '/login'); await p.waitForTimeout(500)
const topo = await p.locator('h1').boundingBox()
confere('celular: título do formulário mais perto do topo', topo.y < 260, `y=${Math.round(topo.y)} (antes 323)`)
await p.screenshot({ path: `${out}/login-celular.png` })
await b.close()
console.log(`\nResumo: ${ok} OK, ${falha} FALHA`)
