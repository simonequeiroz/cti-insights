// Gráficos de estatística do Dashboard: dispersão, histograma e boxplot.
// Confere se aparecem, se a frase da correlação respeita o p-valor, se os
// números do boxplot batem com o Q1/Q3 do Python e se tudo acompanha o
// filtro. Não grava no banco.
import { chromium } from 'playwright-core'
import { CHROME, ENV_JAVA, RAIZ } from './config.mjs'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(ENV_JAVA, 'utf8').split(/\r?\n/)
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const out = process.argv[2] || `${RAIZ}/testes/navegador/saida`
const B = 'http://localhost:5173'
let ok = 0; let falha = 0
const confere = (n, c, d = '') => { c ? ok++ : falha++; console.log(`[${c ? 'OK   ' : 'FALHA'}] ${n} ${d}`) }
const curta = v => v >= 1e6 ? `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi` : `R$ ${Math.round(v / 1e3)} mil`

const b = await chromium.launch({ executablePath: CHROME })
const p = await b.newPage({ viewport: { width: 1366, height: 900 } })
const erros = []; p.on('pageerror', e => erros.push(e.message))

await p.goto(B + '/login')
await p.locator('input[type=email]').fill(env.ADMIN_EMAIL)
await p.locator('input[type=password]').fill(env.ADMIN_PASSWORD)
await p.locator('button[type=submit]').click()
await p.waitForURL('**/dashboard')
const resposta = await (await p.waitForResponse(r => r.url().includes('/api/dashboard'))).json().catch(() => null)
await p.waitForTimeout(2500)
const est = resposta?.estatisticas

const secao = p.locator('section[aria-labelledby="titulo-estatistica"]')
confere('seção "Estatística da carteira" existe', await secao.count() === 1)
const disp = secao.locator('article').filter({ hasText: 'dispersão' })
const hist = secao.locator('article').filter({ hasText: 'histograma' })
const box = secao.locator('article').filter({ hasText: 'boxplot' })
confere('3 gráficos (dispersão, histograma, boxplot)', await disp.count() === 1 && await hist.count() === 1 && await box.count() === 1)
confere('dispersão e histograma desenhados (canvas)', await disp.locator('canvas').count() === 1 && await hist.locator('canvas').count() === 1)

const txtDisp = (await disp.innerText()).replace(/\s+/g, ' ')
const c = est?.correlacao
if (c?.pearson !== undefined && c?.pearson !== null) {
  const esperado = c.p >= 0.05 ? /Sem relação clara/ : /Relação (fraca|moderada|forte)/
  confere('frase da correlação respeita o p-valor do Python', esperado.test(txtDisp), `(r=${c.pearson}, p=${c.p}) → ${txtDisp.match(/(Sem relação clara|Relação [^:]+)/)?.[0]}`)
  confere('mostra o mesmo r do Python', txtDisp.includes(String(c.pearson.toLocaleString('pt-BR', { maximumFractionDigits: 2 }))))
}

const txtBox = (await box.innerText()).replace(/\s+/g, ' ')
if (est?.resumo) {
  confere('boxplot: Q1 igual ao do Python', txtBox.includes(curta(est.resumo.q1)), curta(est.resumo.q1))
  confere('boxplot: mediana igual à do Python', txtBox.includes(curta(est.resumo.mediana)), curta(est.resumo.mediana))
  confere('boxplot: Q3 igual ao do Python', txtBox.includes(curta(est.resumo.q3)), curta(est.resumo.q3))
}
const pontosFora = await box.locator('circle').count()
confere('boxplot: frase conta os clientes fora do padrão', pontosFora === 0 ? /Nenhum cliente fora/.test(txtBox) : txtBox.includes(pontosFora === 1 ? '1 cliente fora' : `${pontosFora} clientes fora`), `${pontosFora} ponto(s)`)
const total = resposta?.estatisticas?.resumo?.totalClientes
const txtHist = (await hist.innerText()).replace(/\s+/g, ' ')
confere('histograma: frase usa o total de clientes', !total || txtHist.includes(`de ${total} clientes`) || /empatam/.test(txtHist), txtHist.match(/A maioria[^.]+\.|As faixas[^.]+\./)?.[0])

await secao.screenshot({ path: `${out}/e1-estatistica.png` })

// Filtro: os gráficos passam a ser da seleção
await p.locator('select').first().selectOption('Saúde'); await p.waitForTimeout(800)
const txtFiltro = (await disp.innerText()).replace(/\s+/g, ' ')
confere('com filtro, dispersão mostra só a seleção (4 clientes de Saúde)', /· 4 clientes/.test(txtFiltro), txtFiltro.match(/· \d+ clientes/)?.[0])
await secao.screenshot({ path: `${out}/e2-estatistica-filtro.png` })
await p.locator('select').first().selectOption({ index: 0 }); await p.waitForTimeout(500)

// Celular: nada sai da largura da tela
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(800)
const largura = await p.evaluate(() => document.documentElement.scrollWidth)
confere('celular: sem rolagem lateral', largura <= 390, `${largura}px`)
await secao.screenshot({ path: `${out}/e3-estatistica-celular.png` })

confere('sem erros de JavaScript', erros.length === 0, erros.join(' | '))
await b.close()
console.log(`\nResumo: ${ok} OK, ${falha} FALHA`)
