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

## 2. Estado atual

- **Branch de trabalho:** `feat/banco-neon-config` (já no GitHub). **Nunca**
  commitar na `main`: cada integrante trabalha na sua branch, e a integração é
  por Pull Request. O PR desta branch fica **para o final**, junto com a tag
  da entrega.
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
| 1 | **Deploy**: front na Vercel; Spring e Python no Render; Neon. Link funcionando na apresentação. Rodar a migração V2 no banco do deploy. CORS no Spring para o domínio da Vercel (ou proxy `/api` pela Vercel). | Crítico (apresentação) + desejável (Nuvem) | Ryan |
| 2 | **Gráficos de dispersão, histograma e boxplot**, calculados no Python (`analise.py` → `estatistica.resultado`) e desenhados no Dashboard. | Crítico (Ciência de Dados) | Miguel + Thyphanny |
| 3 | **Back-end**: 3 exceções próprias tratadas no `ErrosApi`, classes de domínio (Cliente, Consultor, Contrato…) e CORS. | Itens da UC de Back-end | Ricardo |
| 4 | **Divisão de tarefas com prazos e Kanban** (GitHub Projects ou Trello). | Crítico (Relações Humanas) | Simone |
| 5 | **Documento de Automação**: HTTP/REST × Modbus ou OPC-UA, e a planilha como "coleta de dados". O relatório já registra o que não se aplica. | Desejável | Todos |
| 6 | **Frases dos insights** (`analytics-python/insights.py`): "o consultor" para consultoras, "correlação fraca positiva" quando o p-valor mostra que não há correlação, empates em "maior carteira" e "VoIP" virando "Voip". | Crítico (sem conclusões enganosas) | Miguel |
| 7 | **Relatório**: preencher os `<!-- ATUALIZAR -->` (link da Vercel e documento de Automação). | Crítico | Simone |
| 8 | **Vídeo pitch** e **ensaio** da apresentação. Cada integrante precisa explicar a própria parte, um item crítico. | Crítico | Todos |
| 9 | **Antes do PR final**: apagar este arquivo, abrir o PR de `feat/banco-neon-config` → `main` e criar a tag da entrega. | — | Simone |

O relatório e o README já registram as limitações conhecidas (carteira por
consultor, planilha como fonte oficial etc.).

## 4. Montar o ambiente numa máquina nova

1. `git clone` do repositório e `git checkout feat/banco-neon-config`.
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
