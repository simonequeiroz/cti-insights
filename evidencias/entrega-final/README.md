# Evidências da entrega final

Prints e resultados de testes do CTI Insights rodando de ponta a ponta:
Vue 3, Spring Boot, Python (FastAPI e pandas) e PostgreSQL no Neon.
Todos os prints foram tirados em 26/11/2026, no Chrome, com **dados
fictícios**: a carteira é a planilha de aula do professor (`dados.xlsx`, 32
clientes). Desktop em 1366 px e celular em 390 px.

## Telas

| Arquivo | O que mostra |
|---|---|
| `01-home-desktop.png` | Página inicial: proposta, "O que você recebe", "Como funciona" e segurança |
| `02-home-celular.png` | Página inicial no celular |
| `03-login-celular.png` | Login no celular |
| `04-login-desktop.png` | Login no computador |
| `05-login-servidor-fora-do-ar.png` | Mensagem amigável quando o servidor não responde |
| `06-login-sessao-expirada.png` | Aviso de sessão encerrada por inatividade |
| `07-cadastro.png` | Primeiro acesso: o cadastro aguarda a aprovação de um administrador |
| `08-dashboard-desktop.png` | Dashboard: KPIs, 4 gráficos, insights, upsell e tabela de clientes |
| `09-dashboard-celular.png` | Dashboard no celular (cartões e gráficos em uma coluna) |
| `10-menu-celular.png` | Menu hambúrguer aberto no celular, por cima da página |
| `11-importar-enviar.png` | Importação, etapa 1: envio da planilha e histórico |
| `12-importar-revisar.png` | Etapa 2: correções automáticas (`IND.` → `Indústria`), linhas com erro e segmento não reconhecido |
| `13-importar-confirmar.png` | Etapa 3: impacto na carteira antes de gravar |
| `14-clientes.png` | Clientes: busca, filtros, resumo com faturamento, selo de upsell e ações por cliente |
| `15-editar-cliente.png` | Formulário de edição de cliente |
| `16-novo-cliente-validacao.png` | Validação do formulário de novo cliente |
| `17-usuarios.png` | Aprovação de cadastros e papéis (só administrador) |

## Testes ([`testes/`](testes/))

| Arquivo | Resultado |
|---|---|
| `h01-padronizacao.txt` | H01: 100 registros com erros de grafia → 94 de 94 grafias previstas padronizadas |
| `h02-tempo-dashboard.txt` | H02: dashboard completo em cerca de 0,25 s (meta: até 10 s) |
| `front-chrome.txt` | Front contra a API real: 8 de 8 |
| `login-chrome.txt` | Tela de login: 11 de 11 |
| `importacao-chrome.txt` | Importação: histórico, segmentos aceitos, prévia, aviso de tempo e tela final: 11 de 11 |
| `planilha-professor.txt` | Planilha de aula do professor: 36 linhas lidas, 25 corrigidas sozinhas, os 4 erros intencionais recusados, 32 clientes |
| `clientes-chrome.txt` | Tela Clientes: busca, filtros, ordenação, resumo, upsell, CSV e celular: 21 de 21 |
| `menu-lateral-chrome.txt` | Menu lateral: fixo ao rolar, tablet e hambúrguer do celular: 14 de 14 |
| `edicao-cliente-chrome.txt` | Inclusão, edição e exclusão de cliente com recálculo do dashboard: 11 de 11 |
| `front-lint-build.txt` | `npm run lint` sem erros e `npm run build` concluído |

Os testes no navegador foram feitos com Playwright, controlando o Chrome. O
teste da H01 pode ser repetido por qualquer pessoa com
`python analytics-python/teste_h01.py` (com o ETL ligado).
