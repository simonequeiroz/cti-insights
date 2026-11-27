import { chromium } from 'playwright-core'
import { ARQUIVOS, CHROME, ENV_JAVA, PLANILHA_PROFESSOR, RAIZ } from './config.mjs'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(ENV_JAVA,'utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1).trim()]))
const out = process.argv[2] || `${RAIZ}/testes/navegador/saida`, B='http://localhost:5173'
const b = await chromium.launch({ executablePath:CHROME })
const p = await b.newPage({ viewport:{ width:1366, height:900 } })
const erros=[]; p.on('pageerror',e=>erros.push(e.message))
await p.goto(B+'/login'); await p.locator('input[type=email]').fill(env.ADMIN_EMAIL); await p.locator('input[type=password]').fill(env.ADMIN_PASSWORD)
await p.locator('button[type=submit]').click(); await p.waitForURL('**/dashboard')
await p.goto(B+'/upload'); await p.waitForTimeout(1000)
await p.locator('input[type=file]').setInputFiles(PLANILHA_PROFESSOR)
await p.getByRole('button',{name:'Verificar planilha'}).click(); await p.waitForTimeout(2000)
await p.screenshot({ path:`${out}/dados-revisar.png`, fullPage:true })
console.log((await p.locator('main section').first().innerText()).replace(/\n{2,}/g,'\n').slice(0,4000))
const cont = p.getByRole('button',{name:/continuar/i}).first()
if (await cont.count()) { await cont.click(); await p.waitForTimeout(800); await p.screenshot({ path:`${out}/dados-confirmar.png`, fullPage:true })
  console.log('\n=== CONFIRMAR ===\n'+(await p.locator('main section').first().innerText()).replace(/\n{2,}/g,'\n').slice(0,1500)) }
console.log('erros js:', erros)
await b.close()
