import { chromium } from 'playwright-core'
import { ARQUIVOS, CHROME, ENV_JAVA, PLANILHA_PROFESSOR, RAIZ } from './config.mjs'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(ENV_JAVA,'utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1).trim()]))
const out = process.argv[2] || `${RAIZ}/testes/navegador/saida`, B='http://localhost:5173'
let ok=0,falha=0; const confere=(n,c,d='')=>{c?ok++:falha++; console.log(`[${c?'OK   ':'FALHA'}] ${n} ${d}`)}
const b = await chromium.launch({ executablePath:CHROME })
const login = async (p, senha = env.ADMIN_PASSWORD) => { await p.goto(B+'/login'); await p.locator('input[type=email]').fill(env.ADMIN_EMAIL); await p.locator('input[type=password]').fill(senha); await p.locator('button[type=submit]').click() }

// ---------- A) Tela Usuários (lista simulada) ----------
const ctx = await b.newContext({ viewport:{ width:1366, height:900 } })
await ctx.grantPermissions(['clipboard-read','clipboard-write'], { origin: B })
let p = await ctx.newPage(); const erros=[]; p.on('pageerror',e=>erros.push(e.message))
const dialogos=[]; p.on('dialog', d=>{ dialogos.push(d.message()); d.accept() })
await login(p); await p.waitForURL('**/dashboard')
const agora = new Date().toISOString()
const eu = { id:1, nome:'Simone Queiroz', email:env.ADMIN_EMAIL, papel:'ADMINISTRADOR', papelSolicitado:'ADMINISTRADOR', status:'APROVADO', criadoEm:'2026-11-26T10:00:00Z', avaliadoEm:null, avaliadoPor:null }
const lista = [eu,
 { id:2, nome:'Ana Souza', email:'ana.souza@cti.exemplo', papel:'CONSULTOR', papelSolicitado:'CONSULTOR', status:'PENDENTE', criadoEm:agora, avaliadoEm:null, avaliadoPor:null },
 { id:3, nome:'Marcos Reis', email:'marcos.reis@cti.exemplo', papel:'ADMINISTRADOR', papelSolicitado:'ADMINISTRADOR', status:'PENDENTE', criadoEm:agora, avaliadoEm:null, avaliadoPor:null },
 { id:4, nome:'Carla Mendes', email:'carla.mendes@cti.exemplo', papel:'CONSULTOR', papelSolicitado:'CONSULTOR', status:'APROVADO', criadoEm:'2026-11-20T10:00:00Z', avaliadoEm:'2026-11-21T10:00:00Z', avaliadoPor:{nome:'Simone Queiroz', email:env.ADMIN_EMAIL} },
 { id:5, nome:'Carlos Lima', email:'carlos.lima@cti.exemplo', papel:'CONSULTOR', papelSolicitado:'CONSULTOR', status:'REJEITADO', criadoEm:'2026-11-19T10:00:00Z', avaliadoEm:'2026-11-21T10:00:00Z', avaliadoPor:{nome:'Simone Queiroz', email:env.ADMIN_EMAIL} }]
const patches = []
await p.route('**/api/usuarios', r => r.request().method()==='GET' ? r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(lista) }) : r.fallback())
await p.route('**/api/usuarios/*/senha-temporaria', r => r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ senhaTemporaria:'Ab3dEf7hJk9m' }) }))
await p.route(/\/api\/usuarios\/\d+$/, async r => { const id=Number(r.request().url().split('/').pop()); const body=JSON.parse(r.request().postData()); patches.push({id,...body}); const u={...lista.find(x=>x.id===id), ...body, avaliadoEm:agora, avaliadoPor:{nome:'Simone Queiroz', email:env.ADMIN_EMAIL}}; const i=lista.findIndex(x=>x.id===id); lista[i]=u; r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(u) }) })
await p.goto(B+'/usuarios'); await p.waitForTimeout(1200)
await p.screenshot({ path:`${out}/u2-desktop.png`, fullPage:true })
const linha = nome => p.locator('li', { hasText: nome })
confere('você não tem ações na própria conta', await linha('(você)').getByRole('button').count() === 0)
confere('aprovada tem Gerar senha e Bloquear', await linha('Carla Mendes').getByRole('button',{name:'Gerar senha temporária'}).count()===1 && await linha('Carla Mendes').getByRole('button',{name:'Bloquear acesso'}).count()===1)
confere('sem acesso tem "Dar acesso"', await linha('Carlos Lima').getByRole('button',{name:/Dar acesso como/}).count()===1)
await linha('Marcos Reis').getByRole('button',{name:'Recusar'}).click(); await p.waitForTimeout(500)
confere('recusar pede confirmação', dialogos.some(m=>m.startsWith('Recusar o cadastro de Marcos')))
await linha('Ana Souza').locator('select').selectOption('GESTOR')
await linha('Ana Souza').getByRole('button',{name:'Aprovar'}).click(); await p.waitForTimeout(600)
confere('aprovar envia o papel escolhido', patches.some(x=>x.id===2 && x.status==='APROVADO' && x.papel==='GESTOR'))
const carla = linha('Carla Mendes')
confere('"Salvar papel" só aparece depois de mudar', await carla.getByRole('button',{name:'Salvar papel'}).count()===0)
await carla.locator('select').selectOption('GESTOR'); await p.waitForTimeout(200)
await carla.getByRole('button',{name:'Salvar papel'}).click(); await p.waitForTimeout(600)
confere('salvar papel envia APROVADO + GESTOR', patches.some(x=>x.id===4 && x.status==='APROVADO' && x.papel==='GESTOR'))
await linha('Carla Mendes').getByRole('button',{name:'Gerar senha temporária'}).click(); await p.waitForTimeout(600)
confere('senha temporária pede confirmação', dialogos.some(m=>m.startsWith('Gerar uma senha temporária para Carla')))
confere('janela mostra a senha', await p.getByRole('dialog').getByText('Ab3dEf7hJk9m').count()===1)
await p.getByRole('button',{name:'Copiar senha'}).click(); await p.waitForTimeout(300)
confere('copiar senha', await p.getByRole('button',{name:'Copiada ✓'}).count()===1)
await p.getByRole('dialog').screenshot({ path:`${out}/u2-senha.png` })
await p.getByRole('button',{name:'Fechar', exact:true}).click()
await linha('Carla Mendes').getByRole('button',{name:'Bloquear acesso'}).click(); await p.waitForTimeout(600)
confere('bloquear pede confirmação', dialogos.some(m=>m.startsWith('Bloquear o acesso de Carla')))
confere('bloquear envia REJEITADO', patches.some(x=>x.id===4 && x.status==='REJEITADO'))
confere('depois de bloquear aparece "Dar acesso"', await linha('Carla Mendes').getByRole('button',{name:/Dar acesso como/}).count()===1)
await p.unroute(/\/api\/usuarios\/\d+$/)
await p.route(/\/api\/usuarios\/\d+$/, r => r.fulfill({ status:409, contentType:'application/json', body: JSON.stringify({ mensagem:'Mensagem do servidor de teste.' }) }))
await linha('Carlos Lima').getByRole('button',{name:/Dar acesso como/}).click(); await p.waitForTimeout(600)
confere('erro mostra a mensagem do Spring', await p.getByText('Mensagem do servidor de teste.').count()===1)
await p.setViewportSize({ width:390, height:844 }); await p.reload(); await p.waitForTimeout(1200)
const btns = [await p.getByRole('button',{name:'Gerar senha temporária'}).first().boundingBox(), await p.getByRole('button',{name:'Bloquear acesso'}).first().boundingBox()]
confere('celular: botões de ação visíveis sem arrastar para o lado', btns.every(x => x && x.x + x.width <= 390), btns.map(x => x && Math.round(x.x + x.width)).join(', '))
confere('celular: sem rolagem lateral', await p.evaluate(()=>document.documentElement.scrollWidth) <= 390)
await p.screenshot({ path:`${out}/u2-celular.png`, fullPage:true })
await ctx.close()

// ---------- B) Troca obrigatória (login simulado) ----------
const ctx2 = await b.newContext({ viewport:{ width:1366, height:900 } }); p = await ctx2.newPage(); p.on('pageerror',e=>erros.push(e.message))
await p.route('**/api/auth/login', r => r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ email:'carla.mendes@cti.exemplo', nome:'Carla Mendes', papel:'CONSULTOR', trocarSenha:true }) }))
await p.route('**/api/auth/senha', r => r.fulfill({ status:204, body:'' }))
await p.route(/\/api\/(clientes|dashboard|uploads)/, r => r.fulfill({ status:200, contentType:'application/json', body:'[]' }))
await p.goto(B+'/login?redirect=%2Frelatorios'); await p.locator('input[type=email]').fill('carla.mendes@cti.exemplo'); await p.locator('input[type=password]').fill('Ab3dEf7hJk9m'); await p.locator('button[type=submit]').click()
await p.waitForURL('**/trocar-senha**')
confere('com senha temporária, vai direto para "Crie uma senha nova"', await p.getByRole('heading',{name:'Crie uma senha nova'}).count()===1)
confere('sem menu durante a troca obrigatória', await p.locator('aside').count()===0)
await p.screenshot({ path:`${out}/u2-obrigatoria.png` })
await p.goto(B+'/dashboard'); await p.waitForTimeout(400)
confere('não consegue abrir outra tela antes de trocar', p.url().includes('/trocar-senha'))
await p.getByRole('textbox',{name:'Senha temporária'}).fill('Ab3dEf7hJk9m'); await p.getByRole('textbox',{name:/^Senha nova/}).fill('nova-senha-1'); await p.getByRole('textbox',{name:'Confirme a senha nova'}).fill('outra-coisa')
await p.getByRole('button',{name:'Salvar e entrar'}).click(); await p.waitForTimeout(300)
confere('confirmação diferente é recusada', /não é igual/.test(await p.getByRole('alert').innerText()))
await p.getByRole('textbox',{name:'Confirme a senha nova'}).fill('nova-senha-1'); await p.getByRole('button',{name:'Salvar e entrar'}).click()
await p.waitForURL(u => !u.pathname.startsWith('/trocar-senha'), { timeout: 5000 }).catch(()=>{})
confere('depois de trocar, entra no sistema', !p.url().includes('/trocar-senha'), p.url())
await ctx2.close()

// ---------- C) Troca voluntária de verdade (e volta) ----------
const ctx3 = await b.newContext({ viewport:{ width:1366, height:900 } }); p = await ctx3.newPage(); p.on('pageerror',e=>erros.push(e.message))
await login(p); await p.waitForURL('**/dashboard')
await p.getByRole('link',{name:'Trocar senha'}).click(); await p.waitForURL('**/trocar-senha')
confere('link "Trocar senha" no menu abre a tela (com menu)', await p.getByRole('heading',{name:'Trocar senha'}).count()===1 && await p.locator('aside').count()===1)
const PROV = 'Provisoria-' + Date.now().toString(36)
const trocar = async (de, para) => { await p.getByRole('textbox',{name:'Senha atual'}).fill(de); await p.getByRole('textbox',{name:/^Senha nova/}).fill(para); await p.getByRole('textbox',{name:'Confirme a senha nova'}).fill(para); await p.getByRole('button',{name:'Trocar senha', exact:true}).click(); await p.waitForTimeout(1500) }
await trocar('senha-errada-xyz', PROV)
confere('senha atual errada é recusada pelo Spring', /não confere/.test(await p.getByRole('alert').innerText()))
await trocar(env.ADMIN_PASSWORD, PROV)
confere('troca real aceita', await p.getByText('Senha trocada.').count()===1)
const t = await b.newContext(); const q = await t.newPage(); await login(q, PROV); await q.waitForURL('**/dashboard', { timeout: 10000 }).catch(()=>{})
confere('entra com a senha nova', q.url().endsWith('/dashboard')); await t.close()
await trocar(PROV, env.ADMIN_PASSWORD)
confere('senha original restaurada', await p.getByText('Senha trocada.').count()===1)
const t2 = await b.newContext(); const q2 = await t2.newPage(); await login(q2); await q2.waitForURL('**/dashboard', { timeout: 10000 }).catch(()=>{})
const restaurada = q2.url().endsWith('/dashboard')
confere('entra de novo com a senha original', restaurada); await t2.close()
if (!restaurada) console.log('ATENÇÃO: a senha da conta pode ter ficado como:', PROV)
confere('sem erros de JavaScript', erros.length===0, erros.join(' | '))
await b.close(); console.log(`\nResumo: ${ok} OK, ${falha} FALHA`)
