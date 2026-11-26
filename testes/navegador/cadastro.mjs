import { chromium } from 'playwright-core'
import { ARQUIVOS, CHROME, ENV_JAVA, PLANILHA_PROFESSOR, RAIZ } from './config.mjs'
const out = process.argv[2] || `${RAIZ}/testes/navegador/saida`, B = 'http://localhost:5173'
let ok = 0, falha = 0
const confere = (n, c, d = '') => { c ? ok++ : falha++; console.log(`[${c ? 'OK   ' : 'FALHA'}] ${n} ${d}`) }
const b = await chromium.launch({ executablePath: CHROME })
const p = await b.newPage({ viewport: { width: 390, height: 844 } })
const erros = []; p.on('pageerror', e => erros.push(e.message))
let chamadas = 0
let resposta = { status: 201, body: { id: 9, nome: 'Ana Souza', email: 'ana.souza@cti.exemplo', papel: 'CONSULTOR', papelSolicitado: 'CONSULTOR', status: 'PENDENTE' } }
await p.route('**/api/auth/cadastro', r => { chamadas++; r.fulfill({ status: resposta.status, contentType: 'application/json', body: JSON.stringify(resposta.body) }) })
await p.goto(B + '/cadastro'); await p.waitForTimeout(600)

const opcoes = (await p.locator('#papel option').allInnerTexts()).map(t => t.trim())
confere('papéis do cadastro: só Consultor e Gestor', JSON.stringify(opcoes.slice(1)) === '["Consultor","Gestor"]', opcoes.join(', '))
confere('dica avisa que o administrador confirma o papel', /administrador confirma o seu papel/.test(await p.locator('#dica-papel').innerText()))

const criar = () => p.getByRole('button', { name: /Criar conta/ }).click()
await criar(); await p.waitForTimeout(300)
const msgs = await p.locator('p[id^="erro-"]').allInnerTexts()
confere('formulário vazio: um erro embaixo de cada campo', msgs.length === 5, msgs.join(' | '))
confere('foco vai para o primeiro campo com erro', await p.evaluate(() => document.activeElement?.id) === 'nome')
confere('campo com erro fica com borda vermelha e aria-invalid', (await p.locator('#nome').getAttribute('class')).includes('border-red-400') && await p.locator('#nome').getAttribute('aria-invalid') === 'true')
confere('nada é enviado ao servidor com erro', chamadas === 0)
await p.screenshot({ path: `${out}/cad2-erros.png`, fullPage: true })

await p.locator('#nome').fill('Ana'); await p.locator('#email').fill('ana@empresa')
await criar(); await p.waitForTimeout(300)
confere('só o nome: pede o sobrenome', await p.locator('#erro-nome').innerText() === 'Digite também o sobrenome.')
confere('e-mail "ana@empresa" barrado no navegador', /e-mail válido/.test(await p.locator('#erro-email').innerText()))

await p.locator('#nome').fill('Ana Souza'); await p.locator('#email').fill('ana.souza@cti.exemplo')
await p.locator('#papel').selectOption('CONSULTOR'); await p.locator('#senha').fill('12345678'); await p.locator('#confirmar-senha').fill('12345679')
await criar(); await p.waitForTimeout(300)
confere('senhas diferentes: erro só na confirmação', (await p.locator('p[id^="erro-"]').count()) === 1 && /não conferem/.test(await p.locator('#erro-confirmar-senha').innerText()))
confere('foco vai para a confirmação', await p.evaluate(() => document.activeElement?.id) === 'confirmar-senha')

await p.locator('#confirmar-senha').fill('12345678')
resposta = { status: 409, body: { mensagem: 'E-mail já cadastrado.' } }
await criar(); await p.waitForTimeout(500)
const alerta = p.locator('[role=alert]')
confere('409: mensagem geral em 14 px', /já tem cadastro/.test(await alerta.innerText()) && (await alerta.getAttribute('class')).includes('text-sm'))

resposta = { status: 201, body: { id: 9, nome: 'Ana Souza', email: 'ana.souza@cti.exemplo', papel: 'CONSULTOR', papelSolicitado: 'CONSULTOR', status: 'PENDENTE' } }
await criar(); await p.waitForTimeout(500)
const final = (await p.locator('[role=status]').innerText()).replace(/\s+/g, ' ')
confere('tela final orienta a avisar o administrador', /Avise o administrador da sua equipe/.test(final) && /não envia e-mail/.test(final), final.slice(0, 160))
await p.screenshot({ path: `${out}/cad2-enviado.png`, fullPage: true })

// primeira conta do sistema (entra direto): endereço de retorno seguro
const p2 = await b.newPage()
await p2.route('**/api/auth/cadastro', r => r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 1, nome: 'Primeira Pessoa', email: 'p@cti.exemplo', papel: 'CONSULTOR', status: 'APROVADO' }) }))
await p2.route('**/api/auth/login', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email: 'p@cti.exemplo', nome: 'Primeira Pessoa', papel: 'CONSULTOR' }) }))
await p2.route(/\/api\/(clientes|dashboard|uploads)/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
await p2.goto(B + '/cadastro?redirect=' + encodeURIComponent('//site-falso.com'))
await p2.locator('#nome').fill('Primeira Pessoa'); await p2.locator('#email').fill('p@cti.exemplo'); await p2.locator('#papel').selectOption('CONSULTOR')
await p2.locator('#senha').fill('12345678'); await p2.locator('#confirmar-senha').fill('12345678')
await p2.getByRole('button', { name: /Criar conta/ }).click(); await p2.waitForTimeout(1500)
const u = new URL(p2.url())
confere('redirect externo no cadastro vai ao Dashboard', u.host === 'localhost:5173' && u.pathname === '/dashboard', u.href)
confere('sem erros de JavaScript', erros.length === 0, erros.join(' | '))
await b.close(); console.log(`\nResumo: ${ok} OK, ${falha} FALHA`)
