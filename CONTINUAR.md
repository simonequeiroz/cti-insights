# Tarefa: continuar a reta final do CTI Insights

> Arquivo de passagem de trabalho entre sessões do Claude Code (escrito em
> 26/11/2026). **Apague este arquivo antes do Pull Request final.**

## 1. Contexto em 1 minuto

- **Projeto Integrador II** do SENAI "Roberto Mange", grupo **Data Pulse**
  (ADS Turma B). O sistema recebe a planilha da carteira de clientes do
  Provedor CTI, padroniza os dados (Python), grava no PostgreSQL do Neon e
  mostra dashboard, insights e upsell (Vue + Spring Boot).
- Quem conduz o trabalho com o Claude é a **Simone** (Gestão, SAGA e QA). Ela
  assumiu também as partes atrasadas dos outros squads.
- **Prazos:**
  - **Terça, 01/12/2026:** pré-apresentação ao coordenador.
  - **Quinta, 03/12/2026:** entrega final.
  - **Quinta, 10/12/2026:** apresentação.
  - O **vídeo pitch** ainda precisa ser gravado.
- **Combinado com a equipe:** os squads têm até **sexta, 27/11**. O que estiver
  pendente no **sábado, 28/11**, a Simone assume com o Claude. Comece
  perguntando a ela o que cada squad entregou.
- **Rubrica oficial:** `5.01-FR-97 v.4 - PI2 - 2026 - revisado.pdf`, na pasta
  `material-frontend/`, ao lado deste repositório (fora do Git; **não
  commitar**).
  - Os PDFs não abrem direto: extraia o texto com `pypdf`.
  - Nota 10 exige todos os itens críticos e desejáveis. Sem todos os críticos,
    a nota é 4.

## 2. Estado atual (atualizado em 27/11/2026, fim do dia)

- **Branch de trabalho:** `feat/gestao-reta-final`, sincronizada com a `main`
  (PRs #19 e #20 mesclados em 27/11). **Nunca** commitar na `main`: cada
  integrante trabalha na sua branch, e a integração é por Pull Request. Quem
  mescla é a Simone.
- **Feito em 27/11:**
  - PR #18 do Ricardo (exceções, classes de domínio, CORS) + correção de acentos.
  - `docs/AUTOMACAO-INDUSTRIAL.md` (HTTP/REST × Modbus).
  - Kanban: [quadro](https://github.com/users/simonequeiroz/projects/1) e
    `docs/DIVISAO-DE-TAREFAS.md`. Ricardo, Thyphanny e Miguel são editores;
    falta o usuário do GitHub do Ryan.
  - Gráficos de dispersão, histograma e boxplot no Dashboard, calculados em
    `frontend-vue/src/utils/estatistica.js` (mesmo método do pandas/scipy). O
    Python pode mandar o bloco `graficos` (formato no README do
    `analytics-python`), mas é opcional. Parte de Dashboard assumida pela Gestão.
  - Revisão "como cliente" de todas as telas e `docs/GUIA-DE-ACESSO.md`.
  - Histórico de testes apagado do Neon: a carteira ativa é a telemetria 11
    (`dados.xlsx`, 32 clientes). **Não rode `testes/navegador/edicao-cliente.mjs`
    antes da apresentação**: ele suja o histórico.
  - **Sempre usar o Vue na porta 5173** (o Spring só aceita essa origem). O
    Vite agora para com "Port 5173 is already in use" em vez de pular de porta.
- **Tudo testado em 26/11** (`evidencias/entrega-final/testes/passada-geral.txt`):
  - back-end 6/6;
  - Python: H01 confirmada;
  - 117 verificações no Chrome;
  - modo demonstração 10/10;
  - lint e build limpos.
- **Feito nesta reta (26/11):**
  - **Documentos:** README da entrega final, `docs/RELATORIO-FINAL.md`,
    `docs/CONFIDENCIALIDADE-E-LGPD.md` e evidências (prints + saídas de
    teste).
  - **Telas revisadas do ponto de vista do cliente:** Home, Login, Cadastro,
    Importar, Dashboard, Clientes (rota `/relatorios`), Usuários e menu
    lateral.
  - **Front:**
    - axios;
    - CardIndicador;
    - edição de clientes;
    - filtros e ordenação;
    - selo de upsell;
    - curva ABC;
    - Top 10;
    - menu fixo;
    - telas carregadas sob demanda.
  - **Back-end (área do Ricardo):** senha temporária
    (`POST /usuarios/{id}/senha-temporaria`) e troca de senha
    (`POST /auth/senha`). Bloquear acesso e trocar papel valem na hora.
  - **Banco:** coluna `usuario.trocar_senha`
    (`database/migracoes/V2__trocar_senha.sql`). **Já aplicada** no Neon da
    Simone. Qualquer outro banco, inclusive o do deploy, precisa rodar a V2.
  - **Dados de demonstração:** a carteira no Neon é a planilha de aula do
    professor (`material-frontend/dados.xlsx`, 32 clientes fictícios).

## 3. O que falta (por prioridade)

| # | Item | Rubrica | Dono original |
|---|---|---|---|
| 1 | **Frases dos insights** (`analytics-python/insights.py`): "segmento com mais clientes" no lugar de "concentra a maior carteira"; "o consultor" para consultoras; "correlação fraca" quando p ≥ 0,05 deve virar "sem relação clara"; empates; "VoIP" virando "Voip" (`limpeza.py`, linha 75). Mensagem enviada ao Miguel em 27/11; se ele não fizer até 28/11, a Simone faz com o Claude. A lista de insights do Dashboard (`utils/destaqueInsight.js`) já reconhece essas variações. | Crítico (sem conclusões enganosas) | Miguel |
| 2 | **Deploy**: front na Vercel; Spring e Python no Render; Neon. Rodar a migração V2 no banco do deploy. `CORS_ALLOWED_ORIGINS` com o domínio da Vercel (ou proxy `/api`). | Crítico (apresentação) + desejável (Nuvem) | Ryan (prazo 29/11) |
| 3 | **Relatório e README**: preencher os `<!-- ATUALIZAR -->` com o link publicado. | Crítico | Simone |
| 4 | **Ensaio** (30/11) e **pré-apresentação** (01/12). Cada integrante explica a própria parte, um item crítico. | Crítico | Todos |
| 5 | **Vídeo pitch** (até 09/12). | Crítico | Todos |
| 6 | **Antes do PR final (03/12)**: apagar este arquivo, abrir o PR de `feat/gestao-reta-final` → `main` e criar a tag da entrega. | — | Simone |

O relatório e o README já registram as limitações conhecidas (carteira por
consultor, planilha como fonte oficial etc.).

## 4. Montar o ambiente numa máquina nova

1. `git clone` do repositório e `git checkout feat/gestao-reta-final`.
2. **JDK 21.** Se não houver JDK instalado, um Temurin 21 portátil serve:
   aponte `JAVA_HOME` para ele em cada comando.
3. **Python 3.11+** e **Node 20.19+**.
4. **Os `.env` não estão no Git (têm senha).** Copie os três da máquina
   antiga por um meio seguro, como um pendrive ou um gerenciador de senhas.
   Nunca por chat ou repositório.
   - `backend-java/.env`: `DB_URL` (JDBC, com `-pooler`), `DB_USER`,
     `DB_PASSWORD`, `ETL_API_KEY`, `ADMIN_NAME`, `ADMIN_EMAIL`,
     `ADMIN_PASSWORD`, `SESSION_COOKIE_SECURE=false`.
   - `analytics-python/.env`: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
     `DB_SSLMODE=require` e a **mesma** `ETL_API_KEY`.
   - `frontend-vue/.env`: `VITE_USE_MOCK=false` e `VITE_API_URL=/api`.
   - Sem os arquivos antigos: os dados de conexão estão no painel do Neon
     (projeto `cti-insights`, região São Paulo), em **Connect**. Também dá
     para usar `npx neonctl connection-string --pooled` depois de
     `npx neonctl auth`.
5. **Subir** (um terminal para cada):
   ```bash
   cd analytics-python && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt && uvicorn api:app --port 8000
   cd backend-java && .\mvnw.cmd spring-boot:run
   cd frontend-vue && npm install && npm run dev
   ```
6. **Conferir:** http://localhost:5173 → login com o administrador do
   `ADMIN_EMAIL`. Depois, rode os testes:
   - `testes/navegador/README.md` para o navegador;
   - `.\mvnw.cmd test` para o back-end;
   - `python analytics-python/teste_h01.py` para o Python.

## 5. Armadilhas conhecidas

- **Testes Java no Neon:** o `TEST_DB_URL` precisa do endereço **sem
  `-pooler`**. O pooler perde o esquema entre transações, e o teste grava
  lixo nas tabelas reais.
- **`ADMIN_*` só vale no primeiro start.** Trocar o `.env` depois não muda a
  conta. Para aplicar a troca, use `python testes/ferramentas/atualizar_admin.py`.
- **Senha antiga vazada:** uma senha antiga do Neon do Ryan vazou num commit
  público (já registrado no documento de LGPD). Nunca a use. Nunca escreva
  senha em `application.properties`, README ou URL.
- **`testes/navegador/usuarios.mjs`** troca a senha do admin e a restaura no
  fim. Se falhar no meio, ele imprime a senha provisória.
- **`testes/navegador/edicao-cliente.mjs`** grava no banco: deixa 3 linhas de
  "Alteração manual" no histórico. Rode com moderação.
- **O console web do Neon** dava "Something went wrong" com a tradução
  automática do navegador ligada.

## 6. Como a Simone gosta de trabalhar

- Escreva tudo em **português**, de forma clara e sem jargão.
- **Antes de alterar, explique o que vai mudar.** Para telas, o padrão que
  funcionou foi:
  1. analisar "como cliente", testando no Chrome com prints;
  2. mostrar uma tabela de problemas, com o impacto de cada um;
  3. propor a correção e esperar o "pode aplicar";
  4. implementar e testar;
  5. fazer commit e push na branch.
- Mudanças em partes de outros integrantes: implemente, mas avise quem
  precisa saber explicar na apresentação.
- Nunca mostre senhas na saída. Os scripts leem os `.env` sem imprimir.
