# CTI Insights

Sistema de tratamento e análise de dados comerciais do Provedor CTI, desenvolvido
no **Projeto Integrador II** do SENAI "Roberto Mange" (ADS, Turma B, CSTADS126N2)
pelo grupo **Data Pulse**.

## O problema

A carteira de clientes do Provedor CTI é controlada em planilhas Excel, sem
padronização nem centralização. Cada consultor escreve do seu jeito
(`IND.`, `industria`, `Indústria`), o que impede comparar segmentos, níveis e
consultores e esconde as oportunidades de venda.

## A solução

O CTI Insights recebe a planilha da carteira, valida e padroniza os dados,
grava tudo em um banco PostgreSQL na nuvem e mostra um dashboard com
indicadores, gráficos e **insights em texto**, com destaque para as
oportunidades de **upsell**: clientes que podem contratar mais serviços.

Fora do escopo, por orientação da professora: clientes ativos ou inativos,
cancelamentos e churn.

## Como funciona

```
 Planilha (.xlsx/.xls/.csv)
   │ 1. Consultor envia na tela Importar
   ▼
 Vue 3 + Pinia ───────── 2. lê, valida e mostra os erros; o usuário confirma
   │ 3. POST /api/uploads  (JSON só com as linhas válidas)
   ▼
 Spring Boot (Java) ──── 4. revalida (DTO + @Valid) e grava o envio (PROCESSANDO)
   │ 5. POST /etl  (chave X-ETL-Key)
   ▼
 Python (FastAPI) ────── 6. padroniza (pandas), calcula estatísticas e upsell,
   │                        escreve os insights e grava no banco
   ▼
 PostgreSQL (Neon) ───── cliente, consultor, servico, contrato, estatistica, insight
   ▲
   │ 7. GET /api/dashboard  (o Spring lê o que o Python gravou)
 Vue ─────────────────── 8. Dashboard e Clientes desenham os números e as frases
```

Os dados são validados três vezes: no Vue, para avisar o usuário na hora; no
Spring, porque nunca se confia só no navegador; e no Python, que padroniza o
texto. O Vue **nunca** acessa o banco. O detalhe de cada etapa e os acordos
entre as partes estão em [docs/FLUXO-DO-SISTEMA.md](docs/FLUXO-DO-SISTEMA.md).

## Situação da entrega final

| Parte | Situação |
|---|---|
| Front-End (Vue 3) | Pronto e integrado à API real. Login, cadastro, importação em etapas, dashboard, relatórios e gestão de usuários. |
| Back-End (Spring Boot) | Pronto. Autenticação por sessão com CSRF, papéis, upload, CRUD de clientes, dashboard e chamada ao ETL. |
| Ciência de Dados (Python) | Pronto. Limpeza, estatísticas (média, mediana, desvio padrão, quartis, correlação), upsell e insights. |
| Banco (PostgreSQL no Neon) | Pronto. Esquema aplicado no Neon e fluxo completo testado de ponta a ponta. |
| Publicação na nuvem | Em andamento. |

## Tecnologias e versões principais

| Parte | Tecnologia | Versão |
|---|---|---|
| Front-End | Vue 3 (`<script setup>`) | 3.5 |
| | Vite | 8.3 |
| | Vue Router | 5.3 |
| | Pinia | 4.0 |
| | Tailwind CSS | 4.3 |
| | Chart.js + vue-chartjs | 4.5 e 5.3 |
| | SheetJS (`xlsx`) | 0.20.3 |
| | Node.js | 20.19+ ou 22.12+ |
| Back-End | Java | 21 |
| | Spring Boot (Web, Security, Validation, JDBC) | 4.1.1 |
| | Maven (via Maven Wrapper `mvnw`) | 3.9 |
| Dados | Python | 3.11+ |
| | pandas, NumPy, SciPy | 2.2+, 1.26+, 1.13+ |
| | FastAPI + Uvicorn | 0.115+ e 0.30+ |
| | SQLAlchemy + psycopg | 2.0+ e 3.2+ |
| Banco | PostgreSQL no Neon | 18 |

## Estrutura do repositório

| Pasta | Conteúdo | Responsável |
|---|---|---|
| [`frontend-vue/`](frontend-vue/) | Aplicação Vue 3 | Thyphanny |
| [`backend-java/`](backend-java/) | API Spring Boot | Ricardo Jairi |
| [`analytics-python/`](analytics-python/) | ETL e análises em Python | Miguel Herculano Viana |
| [`database/`](database/) | Esquema do banco (`schema.sql`) | Ryan |
| [`docs/`](docs/) | Fluxo do sistema | Simone |
| [`evidencias/`](evidencias/) | Prints e registros de execução | Simone |
| `01_Documentacao/`, `02_Modelagem_e_Diagramas/`, `03_Prototipos_UX_UI/` | Documentação da Sprint 1, diagrama de classes e protótipos do Figma | Simone |

O professor sugere os nomes `frontend/`, `backend/` e `python/`. Mantivemos os
nomes registrados na Sprint 1.

## Como executar

São três serviços, cada um em um terminal: Python (porta 8000), Spring
(porta 8080) e Vue (porta 5173).

### 1. Pré-requisitos

- Node.js 20.19+ ou 22.12+ e npm
- JDK 21. O Maven não precisa ser instalado, porque o projeto usa o `mvnw`.
- Python 3.11+
- Um banco PostgreSQL. Usamos o [Neon](https://neon.tech), que tem plano gratuito.

### 2. Banco de dados

Crie um projeto no Neon e aplique o esquema pelo **SQL Editor** do painel,
colando o conteúdo de [`database/schema.sql`](database/schema.sql). Com o
`psql` instalado, também funciona:

```bash
psql "postgresql://USUARIO:SENHA@ep-SEU-ENDPOINT.REGIAO.aws.neon.tech/neondb?sslmode=require" -v ON_ERROR_STOP=1 -f database/schema.sql
```

Os dados de conexão ficam em **Connect** no painel do Neon.

### 3. Arquivos `.env`

Copie cada `.env.example` para `.env` e preencha com os seus dados. Os
arquivos `.env` têm senhas e **não vão para o Git** (estão no `.gitignore`).

| Arquivo | O que preencher |
|---|---|
| [`analytics-python/.env.example`](analytics-python/.env.example) | `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSLMODE=require` e `ETL_API_KEY` |
| [`backend-java/.env.example`](backend-java/.env.example) | `DB_URL` (formato JDBC), `DB_USER`, `DB_PASSWORD`, a **mesma** `ETL_API_KEY`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `SESSION_COOKIE_SECURE=false` (só para HTTP local) |
| [`frontend-vue/.env.example`](frontend-vue/.env.example) | `VITE_USE_MOCK=false` e `VITE_API_URL=/api` |

A `ETL_API_KEY` é uma senha qualquer, combinada entre o Java e o Python.
`ADMIN_*` cria o primeiro administrador na primeira vez que o Spring inicia.
Depois disso, apague `ADMIN_PASSWORD` do `.env`.

### 4. Iniciar os serviços

```bash
# Terminal 1: Python
cd analytics-python
python -m venv .venv
.venv\Scripts\activate            # Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn api:app --port 8000

# Terminal 2: Spring Boot
cd backend-java
.\mvnw.cmd spring-boot:run        # Mac/Linux: ./mvnw spring-boot:run

# Terminal 3: Vue
cd frontend-vue
npm install
npm run dev
```

Abra **http://localhost:5173**. O Vite encaminha as chamadas `/api` para o
Spring na porta 8080.

Para conferir cada serviço: http://localhost:8000/saude responde
`{"status":"ok"}` e http://localhost:8080/api/health responde `200`.

### Modo demonstração (sem back-end)

Para ver só as telas, sem Java, Python e banco, deixe `VITE_USE_MOCK=true` no
`frontend-vue/.env` e rode apenas o terminal 3. Nesse modo, o login e os dados
ficam salvos no próprio navegador (`localStorage`).

## Como usar

1. **Entrar:** use o e-mail e a senha do administrador definidos em `ADMIN_*`.
   Outras pessoas usam **Criar conta** e esperam a aprovação do administrador
   na tela **Usuários**.
2. **Importar:** em **Importar**, envie a planilha da carteira. O sistema
   mostra os erros por linha, avisa sobre segmentos não reconhecidos e pede
   confirmação. Cada planilha enviada substitui a carteira anterior.
3. **Analisar:** o **Dashboard** mostra os indicadores, os gráficos, as
   oportunidades de upsell e os insights. **Clientes** lista a base de
   clientes com busca e filtros.

As colunas esperadas na planilha e as regras de cada uma estão em
[frontend-vue/README.md](frontend-vue/README.md), na seção "Formato esperado
da planilha".

| Papel | O que pode fazer |
|---|---|
| Consultor | Ver os dados, importar planilhas, incluir e editar clientes |
| Gestor | Ver dashboard e relatórios |
| Administrador | Tudo, mais aprovar cadastros e excluir clientes |

## Telas

| Rota | Tela | O que faz |
|---|---|---|
| `/` | Home pública | Apresenta o sistema e leva ao Login |
| `/login` e `/cadastro` | Login e Cadastro | Acesso e pedido de conta |
| `/dashboard` | Dashboard | KPIs, gráficos por segmento, nível (curva ABC), período e serviço, upsell, insights, filtros e exportação CSV/PDF |
| `/upload` | Importar | Envio em etapas (enviar, revisar, confirmar e concluir) e histórico de envios |
| `/relatorios` | Clientes | Carteira de clientes com busca, período, exportação CSV e inclusão, edição e exclusão de cliente |
| `/usuarios` | Usuários | Só administrador: aprova ou recusa cadastros e define papéis |

A interface é responsiva. No celular, o menu lateral vira um menu hambúrguer.

## Testes

| O que | Como rodar |
|---|---|
| Back-End | `cd backend-java` e `.\mvnw.cmd test`. A suíte HTTP precisa de `TEST_DB_URL`. No Neon, use o endereço **sem** `-pooler` ([detalhes](backend-java/README.md#testar)). |
| Python, sem banco | Com o ETL ligado, abra http://localhost:8000/docs e rode `/testar` com [`amostras/clientes.json`](analytics-python/amostras/clientes.json). O esperado é 2 clientes com média e mediana de 1.135.000. |
| Hipótese H01 (100 registros com erros de grafia) | Com o ETL ligado: `cd analytics-python` e `python teste_h01.py` |
| Front-End | `cd frontend-vue` e `npm run lint` e `npm run build` |
| Fluxo completo | Login, importação de uma planilha, conferência no Dashboard e em Clientes, e logout |

Os prints e a saída dos testes estão em [`evidencias/entrega-final/`](evidencias/entrega-final/). Os da Sprint 2 estão em [`evidencias/sprint-2/`](evidencias/sprint-2/).

## Segurança e dados

- Detalhes em [docs/CONFIDENCIALIDADE-E-LGPD.md](docs/CONFIDENCIALIDADE-E-LGPD.md).
- Os dados usados nos testes são **fictícios**. Nenhum dado real de cliente
  da CTI está no repositório.
- Senhas e chaves ficam só nos arquivos `.env`, que não vão para o Git. O
  repositório traz apenas os `.env.example`, sem valores.
- As senhas dos usuários são gravadas com hash (BCrypt). As rotas exigem
  login, e cada papel só acessa o que lhe cabe.
- A conexão com o Neon usa SSL (`sslmode=require`).

## Limitações conhecidas

- Cada planilha enviada **substitui** a carteira anterior. O sistema não
  junta planilhas de períodos diferentes.
- Segmentos fora da lista conhecida são descartados no processamento, e a tela
  avisa quantos clientes saíram por isso.
- Com poucos clientes na planilha, as medidas estatísticas e a correlação têm
  pouco valor e devem ser lidas com cuidado.

## Integrantes e responsabilidades

Grupo **Data Pulse**, ADS Turma B (CSTADS126N2).

| Integrante | Responsabilidade |
|---|---|
| Justino Ricardo Jairi Silvestre | Back-End (Java/Spring Boot) |
| Thyphanny Katherine Silva Franca | Front-End (Vue 3 / Tailwind CSS) |
| Miguel Herculano Viana | Ciência de Dados (Python/pandas) |
| Ryan Vinicius da Silva | Banco de dados e nuvem (PostgreSQL/Neon) |
| Simone Queiroz Batista | Gestão, SAGA e QA: repositório, integração, testes e documentação |

Cada integrante trabalha em uma branch própria, e as mudanças entram na `main`
por Pull Request. O histórico está em
[Pull requests](../../pulls?q=is%3Apr) e [Commits](../../commits/main).

## Versões entregues

| Etapa | Tag |
|---|---|
| Sprint 2 | `sprint-2` (02/10/2026) |
| Entrega final | a criar em 03/12/2026 |

## Documentação

- **Relatório final:** [docs/RELATORIO-FINAL.md](docs/RELATORIO-FINAL.md)
- **Confidencialidade e LGPD:** [docs/CONFIDENCIALIDADE-E-LGPD.md](docs/CONFIDENCIALIDADE-E-LGPD.md)
- Fluxo do sistema: [docs/FLUXO-DO-SISTEMA.md](docs/FLUXO-DO-SISTEMA.md)
- Front-End e formato da planilha: [frontend-vue/README.md](frontend-vue/README.md)
- Contrato da API: [frontend-vue/API-CONTRATO.md](frontend-vue/API-CONTRATO.md)
- Back-End (rotas, permissões e testes): [backend-java/README.md](backend-java/README.md)
- Guia de estudo do Back-End: [backend-java/GUIA-DE-ESTUDO.md](backend-java/GUIA-DE-ESTUDO.md)
- Ciência de Dados: [analytics-python/README.md](analytics-python/README.md)
- Banco de dados: [database/README.md](database/README.md)
- Sprint 1 e correção do professor: `01_Documentacao/Sprint_1/`
- Diagrama de classes: `02_Modelagem_e_Diagramas/`
- Protótipos (Figma): `03_Prototipos_UX_UI/`
