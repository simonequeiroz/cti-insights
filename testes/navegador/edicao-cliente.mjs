// Testa inclusão, edição e exclusão de cliente em Relatórios (API real).
import { chromium } from 'playwright-core'
import { ARQUIVOS, CHROME, ENV_JAVA, PLANILHA_PROFESSOR, RAIZ } from './config.mjs'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(ENV_JAVA, 'utf8')
  .split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const B = 'http://localhost:5173'
const OUT = process.argv[2] || `${RAIZ}/testes/navegador/saida`
let ok = 0, falha = 0
const confere = (nome, passou, detalhe = '') => { passou ? ok++ : falha++; console.log(`[${passou ? 'OK   ' : 'FALHA'}] ${nome} ${detalhe}`) }

const b = await chromium.launch({ executablePath: CHROME })
const p = await b.newPage({ viewport: { width: 1366, height: 900 } })
const errosJs = []; p.on('pageerror', e => errosJs.push(e.message))
p.on('dialog', d => d.accept())

const totalDashboard = async () => p.evaluate(async () => (await (await fetch('/api/dashboard')).json()).estatisticas.resumo)
const toast = async texto => { const t = p.locator('[role=status], [role=alert]').filter({ hasText: texto }).last(); await t.waitFor({ timeout: 60000 }); return (await t.locator('p').innerText()).trim() }

await p.goto(B + '/login')
await p.locator('input[type=email]').fill(env.ADMIN_EMAIL)
await p.locator('input[type=password]').fill(env.ADMIN_PASSWORD)
await p.locator('button[type=submit]').click()
await p.waitForURL('**/dashboard')
await p.goto(B + '/relatorios')
await p.getByRole('heading', { name: 'Base de Clientes Detalhada' }).waitFor()
await p.waitForTimeout(1000)
if (await p.getByRole('button', { name: 'Excluir Empresa Teste E2E' }).count()) {
  console.log('limpando cliente de teste da execução anterior')
  await p.getByRole('button', { name: 'Excluir Empresa Teste E2E' }).click()
  await p.getByRole('button', { name: 'Excluir Empresa Teste E2E' }).waitFor({ state: 'detached', timeout: 60000 })
}
const antes = await totalDashboard()
console.log('antes:', antes.totalClientes, 'clientes, total', antes.faturamentoTotal)

await p.goto(B + '/relatorios')
await p.getByRole('heading', { name: 'Base de Clientes Detalhada' }).waitFor()
const dialogo = p.getByRole('dialog')

// 1) formulário vazio
await p.getByRole('button', { name: '+ Novo cliente' }).click()
await p.getByRole('button', { name: 'Incluir cliente' }).click()
const errosCampo = await dialogo.locator('span.text-red-600').count()
confere('formulário vazio mostra erro em cada campo obrigatório', errosCampo === 8, `${errosCampo} erros`)
await p.screenshot({ path: `${OUT}/edicao-erros.png` })

// 2) código repetido (já existe na carteira)
const codigoExistente = (await p.locator('tbody tr td').first().innerText()).trim()
const preencher = async (codigo, nome, fat) => {
  const f = dialogo
  await f.getByLabel('Código do cliente').fill(codigo)
  await f.getByLabel('Empresa').fill(nome)
  await f.getByLabel('Consultor responsável').fill('Beatriz Reis')
  await f.getByLabel('Segmento').selectOption('Tecnologia')
  await f.getByLabel('Nível').selectOption('C')
  await f.getByLabel('Faturamento anual (R$)').fill(String(fat))
  await f.getByLabel('Data da contratação').fill('2025-03-10')
  await f.getByLabel('Serviços contratados').fill('Backup; VoIP')
  await f.getByLabel('Cidade (opcional)').fill('Campinas')
  await f.getByLabel('UF (opcional)').selectOption('SP')
}
await preencher(codigoExistente, 'Empresa Repetida', 1000)
await p.getByRole('button', { name: 'Incluir cliente' }).click()
const msgDup = await dialogo.locator('[role=alert]').innerText({ timeout: 30000 })
confere('código repetido é recusado com mensagem', /já existe/i.test(msgDup), `-> "${msgDup.trim()}"`)

// 3) inclusão
await preencher('TESTE-E2E', 'Empresa Teste E2E', 100000)
await p.getByRole('button', { name: 'Incluir cliente' }).click()
const msgInc = await toast(/incluído|Não foi/)
confere('inclusão salva e avisa', /incluído/.test(msgInc), `-> "${msgInc}"`)
await p.getByRole('cell', { name: 'Empresa Teste E2E', exact: true }).waitFor()
const depoisInc = await totalDashboard()
confere('dashboard recalculado com o novo cliente', depoisInc.totalClientes === antes.totalClientes + 1 && Math.round(depoisInc.faturamentoTotal - antes.faturamentoTotal) === 100000,
  `${depoisInc.totalClientes} clientes, total ${depoisInc.faturamentoTotal}`)
await p.screenshot({ path: `${OUT}/edicao-lista.png`, fullPage: true })

// 4) edição
await p.getByRole('button', { name: 'Editar Empresa Teste E2E' }).click()
const fatAtual = await dialogo.getByLabel('Faturamento anual (R$)').inputValue()
const servAtual = await dialogo.getByLabel('Serviços contratados').inputValue()
confere('formulário de edição vem preenchido', Number(fatAtual) === 100000 && /Backup/.test(servAtual) && /voip/i.test(servAtual), `fat=${fatAtual} serv="${servAtual}"`)
await p.screenshot({ path: `${OUT}/edicao-formulario.png` })
await dialogo.getByLabel('Faturamento anual (R$)').fill('250000')
await p.getByRole('button', { name: 'Salvar alterações' }).click()
const msgEd = await toast(/atualizado|Não foi/)
confere('edição salva e avisa', /atualizado/.test(msgEd), `-> "${msgEd}"`)
await p.waitForTimeout(500)
const depoisEd = await totalDashboard()
confere('dashboard recalculado com o novo faturamento', Math.round(depoisEd.faturamentoTotal - antes.faturamentoTotal) === 250000, `total ${depoisEd.faturamentoTotal}`)

// 5) exclusão
await p.getByRole('button', { name: 'Excluir Empresa Teste E2E' }).click()
const msgEx = await toast(/excluído|Não foi/)
confere('exclusão salva e avisa', /excluído/.test(msgEx), `-> "${msgEx}"`)
await p.waitForTimeout(500)
const depoisEx = await totalDashboard()
confere('carteira volta ao estado inicial', depoisEx.totalClientes === antes.totalClientes && Math.round(depoisEx.faturamentoTotal) === Math.round(antes.faturamentoTotal),
  `${depoisEx.totalClientes} clientes, total ${depoisEx.faturamentoTotal}`)
const linhaTeste = await p.getByRole('cell', { name: 'Empresa Teste E2E', exact: true }).count()
confere('cliente de teste sumiu da lista', linhaTeste === 0)

confere('sem erros de JavaScript', errosJs.length === 0, errosJs.join(' | '))
await b.close()
console.log(`\nResumo: ${ok} OK, ${falha} FALHA`)
process.exit(falha ? 1 : 0)
