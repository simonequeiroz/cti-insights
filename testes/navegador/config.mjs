// Configuração compartilhada dos testes no navegador.
// Os caminhos saem da raiz do projeto (dois níveis acima desta pasta), então
// funcionam em qualquer máquina. Ajuste por variável de ambiente se precisar.
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))

export const RAIZ = resolve(AQUI, '..', '..')

// .env do Spring: os testes leem ADMIN_EMAIL e ADMIN_PASSWORD de lá, sem imprimir
export const ENV_JAVA = resolve(RAIZ, 'backend-java', '.env')

// Chrome ou Edge instalado na máquina (o Playwright não baixa navegador)
export const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'

// Planilha de aula do professor (fora do repositório; dados fictícios)
export const PLANILHA_PROFESSOR = process.env.PLANILHA_PROFESSOR
  || resolve(RAIZ, '..', 'material-frontend', 'dados.xlsx')

// Arquivos de teste desta pasta (planilha com erros, CSVs inválidos)
export const ARQUIVOS = resolve(AQUI, 'arquivos')

// Prints e downloads dos testes (fora do Git)
mkdirSync(resolve(AQUI, 'saida'), { recursive: true })
