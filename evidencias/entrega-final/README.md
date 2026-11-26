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
| `08-dashboard-desktop.png` | Dashboard: origem dos dados, KPIs, 4 gráficos (com a curva ABC), insights, upsell e Top 10 clientes |
| `09-dashboard-celular.png` | Dashboard no celular (cartões e gráficos em uma coluna) |
| `10-menu-celular.png` | Menu hambúrguer aberto no celular, por cima da página |
| `11-importar-enviar.png` | Importação, etapa 1: envio da planilha e histórico |
| `12-importar-revisar.png` | Etapa 2: correções automáticas (`IND.` → `Indústria`), linhas com erro e segmento não reconhecido |
| `13-importar-confirmar.png` | Etapa 3: impacto na carteira antes de gravar |
| `14-clientes.png` | Clientes: busca, filtros, resumo com faturamento, selo de upsell e ações por cliente |
| `15-editar-cliente.png` | Formulário de edição de cliente |
| `16-novo-cliente-validacao.png` | Validação do formulário de novo cliente |
| `17-usuarios.png` | Usuários (só administrador), com a conta real |
| `18-usuarios-acoes.png` | Usuários com cadastros simulados: aprovar, recusar, mudar papel, gerar senha temporária, bloquear e reativar |
| `19-senha-temporaria.png` | Senha temporária gerada, mostrada uma única vez |
| `20-troca-obrigatoria.png` | Quem entra com senha temporária precisa criar uma senha nova |
| `21-cadastro-validacao.png` | Cadastro no celular: erro embaixo de cada campo |

## Testes ([`testes/`](testes/))

| Arquivo | Resultado |
|---|---|
| `h01-padronizacao.txt` | H01: 100 registros com erros de grafia → 94 de 94 grafias previstas padronizadas |
| `h02-tempo-dashboard.txt` | H02: dashboard completo em cerca de 0,25 s (meta: até 10 s) |
| `front-chrome.txt` | Front contra a API real: 8 de 8 |
| `login-chrome.txt` | Tela de login: 11 de 11 |
| `importacao-chrome.txt` | Importação: histórico, segmentos aceitos, prévia, aviso de tempo e tela final: 11 de 11 |
| `planilha-professor.txt` | Planilha de aula do professor: 36 linhas lidas, 25 corrigidas sozinhas, os 4 erros intencionais recusados, 32 clientes |
| `dashboard-chrome.txt` | Dashboard: origem dos dados, filtros, aviso nos insights, Top 10 e PDF: 10 de 10 |
| `clientes-chrome.txt` | Tela Clientes: busca, filtros, ordenação, resumo, upsell, CSV e celular: 21 de 21 |
| `cadastro-chrome.txt` | Cadastro: papéis, erros por campo, e-mail, tela final e retorno seguro: 14 de 14 |
| `usuarios-chrome.txt` | Usuários e troca de senha: 28 de 28 |
| `backend-mvn-test.txt` | Back-end: 6 de 6, incluindo o teste de bloqueio, troca de papel e senha temporária |
| `menu-lateral-chrome.txt` | Menu lateral: fixo ao rolar, tablet e hambúrguer do celular: 14 de 14 |
| `edicao-cliente-chrome.txt` | Inclusão, edição e exclusão de cliente com recálculo do dashboard: 11 de 11 |
| `front-lint-build.txt` | `npm run lint` sem erros e `npm run build` concluído |

Os testes no navegador foram feitos com Playwright, controlando o Chrome. O
teste da H01 pode ser repetido por qualquer pessoa com
`python analytics-python/teste_h01.py` (com o ETL ligado).
