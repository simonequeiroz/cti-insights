# Instruções para o Claude Code neste projeto

**Ao abrir o projeto, leia primeiro [CONTINUAR.md](CONTINUAR.md):** estado
atual, pendências por prioridade, prazos e como montar o ambiente.

## Regras do projeto

- Escreva em **português** (código, comentários, commits e respostas).
- **Nunca commite na `main`.** Cada integrante trabalha na sua branch, e a
  integração é por Pull Request. A branch atual é `feat/banco-neon-config`. O
  PR dela fica para o final.
- **Nunca commite `.env`** nem escreva senhas em arquivos versionados
  (`application.properties`, README, URL de conexão). O repositório é
  público. Não mostre senhas na saída.
- O material do professor fica em `../material-frontend/`, fora do
  repositório: não commite.
- **Antes de alterar, explique o que vai mudar** e espere a confirmação.
- Depois de mudar algo, rode o que for pertinente:
  - front: `npm run lint` e `npm run build` em `frontend-vue`;
  - back-end: `.\mvnw.cmd test`;
  - Python: `teste_h01.py`;
  - navegador: os testes em `testes/navegador/`.
- Os dados de teste são **fictícios** (`analytics-python/amostras/` e a
  planilha de aula do professor).

## Onde está cada coisa

| Pasta | Conteúdo |
|---|---|
| `frontend-vue/` | Vue 3 + Pinia + Tailwind + Chart.js (axios em `src/services/api.js`) |
| `backend-java/` | Spring Boot 4, Java 21, JDBC, sessão + CSRF |
| `analytics-python/` | FastAPI + pandas (limpeza, análise, insights, upsell) |
| `database/` | `schema.sql` e `migracoes/` |
| `docs/` | Relatório final, LGPD e fluxo do sistema |
| `evidencias/` | Prints e saídas de teste (`entrega-final/` e `sprint-2/`) |
| `testes/` | Testes no navegador e ferramentas |
