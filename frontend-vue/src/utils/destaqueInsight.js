// Destaque de cada insight do Dashboard: o tema (com ícone) e o número
// principal, tirados da frase que o Python escreve (analytics-python/
// insights.py). Se a frase mudar e nenhuma regra reconhecer, o insight
// continua aparecendo, só sem o número em destaque.
import { formatarMoedaCurta } from './moeda.js'

// Ícones em traço da biblioteca Heroicons (licença MIT)
export const ICONES = {
  segmento: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z',
  media: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  abc: 'M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z',
  consultor: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
  servico: 'M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z',
  contratacoes: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  correlacao: 'M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941',
  geral: 'M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18'
}

// "R$ 2.261.250,00" → 2261250
const valorEmReais = texto => Number(texto.replace(/[^\d,]/g, '').replace(',', '.'))

const primeiro = (texto, regex) => texto.match(regex)?.[1]

const reais = texto => {
  const achado = primeiro(texto, /(R\$\s?[\d.]+(?:,\d+)?)/)
  return achado ? formatarMoedaCurta(valorEmReais(achado)) : null
}

// "74,0%" → "74%"; "40,6%" continua "40,6%"
const percentual = texto => primeiro(texto, /(\d+(?:,\d+)?)%/)?.replace(/,0$/, '').concat('%') ?? null

// Regras na ordem: a primeira que reconhecer a frase vale
const REGRAS = [
  { teste: /correla[cç][aã]o|rela[cç][aã]o (clara|forte|moderada|fraca)/i, tema: 'Correlação', icone: 'correlacao',
    numero: t => primeiro(t, /Pearson\s*=\s*(-?\d+(?:,\d+)?)/), unidade: 'r de Pearson' },
  { teste: /n[ií]vel A/i, tema: 'Curva ABC', icone: 'abc', numero: percentual, unidade: 'do faturamento' },
  { teste: /m[eé]dia.*mediana/i, tema: 'Média × mediana', icone: 'media', numero: reais, unidade: 'é a média' },
  { teste: /consultor|sob gest[aã]o/i, tema: 'Consultor', icone: 'consultor', numero: reais, unidade: 'sob gestão' },
  { teste: /servi[cç]o mais contratado/i, tema: 'Serviço', icone: 'servico', numero: percentual, unidade: 'dos clientes' },
  { teste: /contrata[cç][oõ]es/i, tema: 'Contratações', icone: 'contratacoes',
    numero: t => primeiro(t, /(\d+) por m[eê]s/), unidade: 'por mês, no máximo' },
  { teste: /segmento/i, tema: 'Segmento', icone: 'segmento',
    numero: t => primeiro(t, /(\d+) clientes?/) ?? primeiro(t, /:\s*(\d+)\s*\(/), unidade: 'clientes' }
]

export function destacarInsight({ titulo, descricao }) {
  const regra = REGRAS.find(r => r.teste.test(descricao))
  const numero = regra?.numero(descricao) ?? null
  return {
    tema: titulo || regra?.tema || 'Insight',
    icone: regra?.icone || 'geral',
    numero,
    unidade: numero ? regra.unidade : '',
    descricao
  }
}
