// Formatos de dinheiro usados nos gráficos de estatística

export const formatarMoeda = valor =>
  Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Curto, para eixos e faixas: R$ 2,4 mi · R$ 850 mil · R$ 900
export const formatarMoedaCurta = valor => {
  const v = Number(valor || 0)
  const abs = Math.abs(v)
  const fmt = (n, casas) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas })
  if (abs >= 1_000_000) return `R$ ${fmt(v / 1_000_000, 1)} mi`
  if (abs >= 1_000) return `R$ ${fmt(v / 1_000, 0)} mil`
  return `R$ ${fmt(v, 0)}`
}
