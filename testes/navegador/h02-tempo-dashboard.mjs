import { chromium } from 'playwright-core'
import { ARQUIVOS, CHROME, ENV_JAVA, PLANILHA_PROFESSOR, RAIZ } from './config.mjs'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(ENV_JAVA,'utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1).trim()]))
const b = await chromium.launch({ executablePath:CHROME })
const p = await b.newPage()
await p.goto('http://localhost:5173/login')
await p.locator('input[type=email]').fill(env.ADMIN_EMAIL); await p.locator('input[type=password]').fill(env.ADMIN_PASSWORD)
await p.locator('button[type=submit]').click(); await p.waitForURL('**/dashboard')
const tempos = []
for (let i = 0; i < 5; i++) {
  await p.goto('http://localhost:5173/relatorios'); await p.waitForTimeout(300)
  const t0 = Date.now()
  await p.goto('http://localhost:5173/dashboard')
  await p.locator('canvas').nth(2).waitFor()
  await p.getByText('Insights Inteligentes').waitFor()
  tempos.push((Date.now() - t0) / 1000)
}
console.log('dashboard completo (s):', tempos.join(', '))
const api = await p.evaluate(async () => { const t=performance.now(); await (await fetch('/api/dashboard')).json(); return (performance.now()-t)/1000 })
console.log('GET /api/dashboard (s):', api.toFixed(2))
await b.close()
