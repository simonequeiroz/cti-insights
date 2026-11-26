# Testes no navegador

Testes de ponta a ponta do CTI Insights, com o Playwright controlando o Chrome
instalado na máquina. Eles usam a API real (Spring, Python e Neon), a não ser
onde o próprio teste diz que simula a resposta do servidor.

## Preparar

```bash
cd testes/navegador
npm install
```

Pré-requisitos:
- Python (porta 8000), Spring (porta 8080) e Vue (porta 5173) ligados, como no
  [README da raiz](../../README.md#como-executar);
- `backend-java/.env` com `ADMIN_EMAIL` e `ADMIN_PASSWORD` da conta de
  administrador. Os testes leem esses valores e não imprimem nada;
- Chrome em `C:/Program Files/Google/Chrome/Application/chrome.exe`. Em outro
  lugar, defina `CHROME_PATH`.

## Rodar

```bash
node front.mjs          # um teste
```

Os prints vão para `saida/`, que não vai para o Git.

| Arquivo | O que testa | Grava no banco? |
|---|---|---|
| `front.mjs` | Erros amigáveis, login, gráficos, celular e logout | Não |
| `login.mjs` | Carregando, sessão expirada, redirect seguro, endereço inexistente | Não (login simulado) |
| `menu-lateral.mjs` | Menu fixo ao rolar, hover, tablet, hambúrguer do celular | Não |
| `importacao.mjs` | Histórico, segmentos aceitos, prévia, aviso de tempo, tela final | Não (confirmação simulada) |
| `clientes.mjs` | Busca, filtros, ordenação, resumo, upsell, CSV, celular | Não |
| `dashboard.mjs` | Origem dos dados, filtros, aviso nos insights, Top 10, PDF | Não |
| `usuarios.mjs` | Gestão de acessos e troca de senha | **Troca a senha do admin e volta para a original** |
| `cadastro.mjs` | Papéis, erros por campo, e-mail, tela final | Não (respostas simuladas) |
| `edicao-cliente.mjs` | Incluir, editar e excluir cliente com recálculo | **Sim**: deixa 3 linhas "Alteração manual" no histórico |
| `h02-tempo-dashboard.mjs` | Tempo para abrir o dashboard (hipótese H02) | Não |
| `planilha-professor.mjs` | Revisão da planilha de aula (`../material-frontend/dados.xlsx`) | Não |
| `modo-demonstracao.mjs` | Fluxo completo sem back-end | Não. Precisa do Vue em modo simulado na porta 5199 (veja abaixo). |
| `evidencias.mjs` | Refaz os prints de `evidencias/entrega-final/` | Não |

Para o modo demonstração, em outro terminal:

```bash
cd frontend-vue
VITE_USE_MOCK=true npx vite --port 5199 --strictPort
```

A planilha do professor fica fora do repositório. Se estiver em outro lugar,
defina `PLANILHA_PROFESSOR` com o caminho completo.
