// Cálculos dos gráficos de estatística do Dashboard: dispersão, histograma e
// boxplot do faturamento.
//
// Sem filtro, o Dashboard usa os números que o Python grava
// (estatisticas.graficos). Com filtro (segmento, nível ou período), ou
// enquanto o Python não manda esse bloco, calcula aqui com a lista de
// clientes que já está na tela. Os dois lados seguem o mesmo método, para
// os números baterem:
// - quartis pelo método linear, o padrão do pandas (Series.quantile);
// - outliers pela regra de 1,5 × IQR (distância entre Q1 e Q3);
// - correlação de Pearson com p-valor bicaudal (como o scipy.stats.pearsonr).

const numero = valor => Number(valor) || 0

// Quantil pelo método linear: posição (n - 1) × p na lista ordenada; entre
// dois valores, interpola. Ex.: Q1 de [10, 20, 30, 40] = 17,5.
export function quantil(ordenados, p) {
  if (!ordenados.length) return null
  const posicao = (ordenados.length - 1) * p
  const abaixo = Math.floor(posicao)
  const acima = Math.ceil(posicao)
  return ordenados[abaixo] + (ordenados[acima] - ordenados[abaixo]) * (posicao - abaixo)
}

// Pontos da dispersão: um por cliente (nº de serviços × faturamento)
export function pontosDispersao(clientes) {
  return clientes.map(cliente => ({
    nome: cliente.nome_cliente,
    servicos: (cliente.servicos || []).length,
    faturamento: numero(cliente.faturamento)
  }))
}

// Boxplot: os 5 números (mínimo, Q1, mediana, Q3, máximo), os limites da
// regra de 1,5 × IQR e os clientes fora desses limites (outliers). Os
// "bigodes" vão até o último cliente dentro dos limites.
export function resumoBoxplot(clientes) {
  const lista = clientes
    .map(cliente => ({ nome: cliente.nome_cliente, faturamento: numero(cliente.faturamento) }))
    .sort((a, b) => a.faturamento - b.faturamento)
  if (!lista.length) return null

  const valores = lista.map(item => item.faturamento)
  const q1 = quantil(valores, 0.25)
  const q3 = quantil(valores, 0.75)
  const iqr = q3 - q1
  const limiteInferior = q1 - 1.5 * iqr
  const limiteSuperior = q3 + 1.5 * iqr
  const dentro = valores.filter(valor => valor >= limiteInferior && valor <= limiteSuperior)

  return {
    minimo: valores[0],
    q1,
    mediana: quantil(valores, 0.5),
    q3,
    maximo: valores[valores.length - 1],
    limiteInferior,
    limiteSuperior,
    bigodeInferior: dentro[0],
    bigodeSuperior: dentro[dentro.length - 1],
    outliers: lista.filter(item => item.faturamento < limiteInferior || item.faturamento > limiteSuperior)
  }
}

// Arredonda o tamanho da faixa para um número "redondo" (1, 2, 2,5 ou 5 ×
// 10ⁿ), para a legenda ficar "R$ 0 a R$ 500 mil", e não "R$ 0 a R$ 487.312".
function passoRedondo(bruto) {
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  const fator = [1, 2, 2.5, 5, 10].find(f => f * potencia >= bruto)
  return fator * potencia
}

// Histograma: faixas de faturamento do mesmo tamanho e quantos clientes
// caem em cada uma. Nº de faixas pela regra de Sturges (1 + log₂ n),
// entre 3 e 10. Cada faixa inclui o início e exclui o fim; a última inclui
// também o fim.
export function faixasHistograma(clientes) {
  const valores = clientes.map(cliente => numero(cliente.faturamento))
  if (!valores.length) return []

  const minimo = Math.min(...valores)
  const maximo = Math.max(...valores)
  if (minimo === maximo) return [{ de: minimo, ate: maximo, clientes: valores.length }]

  const quantidade = Math.min(10, Math.max(3, Math.ceil(1 + Math.log2(valores.length))))
  const passo = passoRedondo((maximo - minimo) / quantidade)
  const inicio = Math.floor(minimo / passo) * passo
  const total = Math.max(1, Math.ceil((maximo - inicio) / passo))

  const faixas = Array.from({ length: total }, (_, i) => ({
    de: inicio + i * passo,
    ate: inicio + (i + 1) * passo,
    clientes: 0
  }))
  valores.forEach(valor => {
    const indice = Math.min(total - 1, Math.floor((valor - inicio) / passo))
    faixas[indice].clientes++
  })
  return faixas
}

// ---------------------------------------------------------------- correlação

// Logaritmo da função gama (aproximação de Lanczos), usado na função beta
function lnGama(x) {
  const c = [76.18009172947146, -86.5053203294168, 24.0140982408309,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]
  let y = x
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5)
  let ser = 1.000000000190015
  c.forEach(valor => { ser += valor / ++y })
  return -tmp + Math.log((Math.sqrt(2 * Math.PI) * ser) / x)
}

// Fração contínua da função beta incompleta (método clássico de Lentz)
function fracaoBeta(a, b, x) {
  const MINIMO = 1e-30
  let c = 1
  let d = 1 - ((a + b) * x) / (a + 1)
  if (Math.abs(d) < MINIMO) d = MINIMO
  d = 1 / d
  let h = d
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2))
    d = 1 + aa * d; if (Math.abs(d) < MINIMO) d = MINIMO
    c = 1 + aa / c; if (Math.abs(c) < MINIMO) c = MINIMO
    d = 1 / d; h *= d * c
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1))
    d = 1 + aa * d; if (Math.abs(d) < MINIMO) d = MINIMO
    c = 1 + aa / c; if (Math.abs(c) < MINIMO) c = MINIMO
    d = 1 / d
    const delta = d * c
    h *= delta
    if (Math.abs(delta - 1) < 3e-12) break
  }
  return h
}

// Beta incompleta regularizada I_x(a, b)
function betaIncompleta(x, a, b) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const frente = Math.exp(lnGama(a + b) - lnGama(a) - lnGama(b) + a * Math.log(x) + b * Math.log(1 - x))
  return x < (a + 1) / (a + b + 2)
    ? (frente * fracaoBeta(a, b, x)) / a
    : 1 - (frente * fracaoBeta(b, a, 1 - x)) / b
}

// Correlação de Pearson entre nº de serviços e faturamento, com o p-valor
// do teste t (bicaudal). p < 0,05: a relação é estatisticamente
// significativa; p ≥ 0,05: os dados não mostram relação.
export function correlacaoPearson(pontos) {
  const n = pontos.length
  if (n < 3) return null
  const mx = pontos.reduce((s, p) => s + p.servicos, 0) / n
  const my = pontos.reduce((s, p) => s + p.faturamento, 0) / n
  let sxy = 0; let sxx = 0; let syy = 0
  pontos.forEach(p => {
    sxy += (p.servicos - mx) * (p.faturamento - my)
    sxx += (p.servicos - mx) ** 2
    syy += (p.faturamento - my) ** 2
  })
  if (!sxx || !syy) return null

  const r = Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)))
  const gl = n - 2
  const p = Math.abs(r) === 1 ? 0 : betaIncompleta(gl / (gl + (r * r * gl) / (1 - r * r)), gl / 2, 0.5)
  return { pearson: r, p, n }
}

// Frase para o cliente: só fala em correlação "fraca/moderada/forte" se o
// p-valor mostrar que ela existe. Mesmo critério de força do Python
// (analise.py): forte ≥ 0,7; moderada ≥ 0,4; abaixo disso, fraca.
export function interpretarCorrelacao(correlacao) {
  if (!correlacao || correlacao.pearson === null || correlacao.pearson === undefined) {
    return 'Poucos dados para medir a relação entre serviços e faturamento.'
  }
  const { pearson: r, p } = correlacao
  if (p !== null && p !== undefined && p >= 0.05) {
    return 'Sem relação clara: ter mais serviços não indica, nesta base, faturamento maior ou menor.'
  }
  const forca = Math.abs(r) >= 0.7 ? 'forte' : Math.abs(r) >= 0.4 ? 'moderada' : 'fraca'
  return r > 0
    ? `Relação ${forca}: clientes com mais serviços tendem a faturar mais.`
    : `Relação ${forca} e inversa: clientes com mais serviços tendem a faturar menos.`
}
