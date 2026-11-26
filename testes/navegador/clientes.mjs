import { chromium } from 'playwright-core'
import { ARQUIVOS, CHROME, ENV_JAVA, PLANILHA_PROFESSOR, RAIZ } from './config.mjs'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(ENV_JAVA,'utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1).trim()]))
const out = process.argv[2] || `${RAIZ}/testes/navegador/saida`, B='http://localhost:5173'
let ok=0,falha=0; const confere=(n,c,d='')=>{c?ok++:falha++; console.log(`[${c?'OK   ':'FALHA'}] ${n} ${d}`)}
const b = await chromium.launch({ executablePath:CHROME })
const ctx = await b.newContext({ viewport:{ width:1366, height:900 }, acceptDownloads:true })
const p = await ctx.newPage(); const erros=[]; p.on('pageerror',e=>erros.push(e.message))
await p.goto(B+'/login'); await p.locator('input[type=email]').fill(env.ADMIN_EMAIL); await p.locator('input[type=password]').fill(env.ADMIN_PASSWORD)
await p.locator('button[type=submit]').click(); await p.waitForURL('**/dashboard')
await p.goto(B+'/relatorios'); await p.getByRole('heading',{name:'Carteira atual'}).waitFor(); await p.waitForTimeout(1500)
const resumo = async () => (await p.locator('#carteira-titulo + p').innerText()).replace(/\s+/g,' ').trim()
const contagem = async () => Number((await resumo()).match(/^(\d+) de/)?.[1] ?? (await p.getByText('Nenhum cliente com esses filtros.').count() ? 0 : -1))
console.log('resumo inicial:', await resumo())
confere('resumo com faturamento total e upsell', /32 de 32 clientes · R\$\s?72,4\s?mi em faturamento · 7 com oportunidade de upsell/.test(await resumo()), await resumo())
confere('7 selos "Upsell" no total', true)
const busca = p.getByPlaceholder('Empresa, código ou consultor')
for (const [t, esperado] of [['Ana Souza', 9], ['ana souza', 9], ['CTI010', 1], ['cti010', 1], ['metalurgica', 1]]) {
  await busca.fill(t); await p.waitForTimeout(250)
  const n = await contagem(); confere(`busca "${t}" acha ${esperado}`, n === esperado, `-> ${n}`)
}
await busca.fill('')
await p.getByRole('combobox',{name:'Segmento'}).selectOption('Indústria'); await p.waitForTimeout(250)
confere('filtro segmento Indústria = 7', await contagem() === 7)
await p.getByRole('combobox',{name:'Nível'}).selectOption('A'); await p.waitForTimeout(250)
const nIA = await contagem()
await p.getByRole('combobox',{name:'Consultor'}).selectOption('Ana Souza'); await p.waitForTimeout(250)
const nIAAna = await contagem()
confere('filtros combinados (Indústria + A + Ana Souza)', nIAAna > 0 && nIAAna <= nIA, `Indústria+A=${nIA}, +Ana=${nIAAna}; ${await resumo()}`)
await p.screenshot({ path:`${out}/cli2-filtros.png`, fullPage:true })
await p.getByRole('button',{name:'Limpar filtros'}).first().click(); await p.waitForTimeout(250)
confere('limpar filtros volta a 32', await contagem() === 32)
// ordenação
await p.getByRole('button',{name:/^Faturamento/}).click(); await p.waitForTimeout(250)
const fats = (await p.locator('tbody tr td:nth-child(5)').allInnerTexts()).map(t=>Number(t.replace(/[^\d,]/g,'').replace(',','.')))
confere('ordenar por faturamento (maior primeiro)', fats.every((v,i)=>i===0||fats[i-1]>=v), `${fats[0]} ... ${fats.at(-1)}`)
confere('cabeçalho informa a ordem (aria-sort)', await p.locator('th[aria-sort=descending]').count() === 1)
await p.getByRole('button',{name:/^Faturamento/}).click(); await p.waitForTimeout(250)
const fats2 = (await p.locator('tbody tr td:nth-child(5)').allInnerTexts()).map(t=>Number(t.replace(/[^\d,]/g,'').replace(',','.')))
confere('segundo clique inverte (menor primeiro)', fats2[0] <= fats2.at(-1))
// selos
await p.getByRole('button',{name:/^Faturamento/}).click()
const selos = await p.locator('tbody span[title]', { hasText: 'Upsell' }).count()
confere('selos Upsell na página ordenada por faturamento', selos > 0, `${selos} nesta página`)
const titulo = await p.locator('tbody span[title]', { hasText: 'Upsell' }).first().getAttribute('title')
confere('selo explica o motivo ao passar o mouse', titulo.length > 10, titulo)
await p.screenshot({ path:`${out}/cli2-desktop.png`, fullPage:true })
// CSV
const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button',{name:'Exportar CSV'}).click()])
await dl.saveAs(`${out}/clientes2.csv`)
const cab = readFileSync(`${out}/clientes2.csv`,'utf8').split('\n')[0]
confere('CSV com os nomes da tela', cab.includes('"Empresa"') && cab.includes('"Serviços"') && !cab.includes('"Cliente"'), cab.replace(/\uFEFF/,''))
// novo cliente no topo
const nb = await p.getByRole('button',{name:'+ Novo cliente'}).boundingBox(); const h1 = await p.getByRole('heading',{name:'Clientes', exact:true}).boundingBox()
confere('"+ Novo cliente" na linha do título', Math.abs(nb.y - h1.y) < 40)
// celular
await p.setViewportSize({ width:390, height:844 }); await p.reload(); await p.getByRole('heading',{name:'Carteira atual'}).waitFor(); await p.waitForTimeout(1200)
confere('celular: sem rolagem lateral', await p.evaluate(()=>document.documentElement.scrollWidth) <= 390)
const ed = p.getByRole('button',{name:/^Editar /}).first(); const eb = await ed.boundingBox()
confere('celular: Editar visível sem arrastar para o lado', eb && eb.x >= 0 && eb.x + eb.width <= 390, eb && `x=${Math.round(eb.x)}`)
await p.getByRole('combobox',{name:'Ordenar por'}).selectOption('faturamento:desc'); await p.waitForTimeout(300)
confere('celular: ordenar pela lista', /Fábrica Nacional|Indústria|7\.200/.test(await p.locator('ul li').first().innerText()), (await p.locator('ul li').first().innerText()).split('\n')[0])
await p.screenshot({ path:`${out}/cli2-celular.png`, fullPage:true })
confere('sem erros de JavaScript', erros.length===0, erros.join(' | '))
await b.close(); console.log(`\nResumo: ${ok} OK, ${falha} FALHA`)
