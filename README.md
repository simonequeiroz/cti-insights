# CTI Insights

Sistema de tratamento e análise de dados comerciais do Provedor CTI, desenvolvido
no **Projeto Integrador II** do SENAI (ADS, Turma B, CSTADS126N2) pelo grupo
**Data Pulse**.

A gestão comercial da carteira de clientes do Provedor CTI é feita hoje em
planilhas Excel, sem padronização nem centralização. O CTI Insights recebe a
planilha, padroniza os dados e apresenta um dashboard com indicadores e
insights para apoiar decisões comerciais.

## Objetivo da Sprint 2

Desenvolver e organizar o **Front-End** do sistema (aplicação Vue 3 navegável,
com as telas previstas para esta etapa) e **criar o projeto Spring Boot**,
iniciando sem erros.

Nesta Sprint **não fazem parte**: CRUD, Controller/Service/Repository, Spring
Data JPA, integração com PostgreSQL, autenticação real (JWT), integração
Vue + Spring Boot, upload real da planilha para a API, relatórios gerados
pelo Back-End e deploy. O login e os dados do front são simulados no navegador.

## Versão da entrega

- **Tag:** `sprint-2` <!-- PREENCHER após criar a tag em 01/10 -->
- **Commit:** `PREENCHER` <!-- código do commit da tag -->

## Tecnologias e versões principais

| Parte | Tecnologia | Versão |
|---|---|---|
| Front-End | Vue 3 (`<script setup>`) | 3.5.42 |
| | Vite | 8.3.0 |
| | Vue Router | 5.3.1 |
| | Pinia | 4.0.3 |
| | Tailwind CSS | 4.3.3 |
| | Chart.js + vue-chartjs | 4.5 e 5.3 |
| | SheetJS (`xlsx`) | 0.20.3 |
| | Node.js | 20.19+ ou 22.12+ |
| Back-End | Java | 21 |
| | Spring Boot | 4.1.1 |
| | Maven (via Maven Wrapper `mvnw`) | 3.9.16 |
| Dados | Python / Pandas (em preparação) | – |
| Banco | PostgreSQL (previsto, ainda não integrado) | – |

## Estrutura do repositório

O professor sugere os nomes `frontend/`, `backend/` e `python/`. Mantivemos os
nomes registrados na Sprint 1:

| Pasta neste repositório | Corresponde a | Responsável |
|---|---|---|
| `frontend-vue/` | `frontend/` | Thyphanny |
| `backend-java/` | `backend/` | Ricardo Jairi |
| `analytics-python/` | `python/` | Miguel Herculano Viana |
| `database/` | (banco de dados) | Ryan |
| `evidencias/` | `evidencias/` | Simone |
| `01_Documentacao/`, `02_Modelagem_e_Diagramas/`, `03_Prototipos_UX_UI/` | documentação, diagrama de classes e protótipos | Simone |

## Como executar o Front-End

Pré-requisito: Node.js 20.19+ ou 22.12+ e npm.

```bash
cd frontend-vue
npm install        # instala as dependências
npm run dev        # inicia em http://localhost:5173
```

Outros comandos: `npm run build` (versão de produção), `npm run lint`
(verificação de código) e `npm run format`.

**Como entrar:** não há autenticação real. A tela de Login aceita qualquer
e-mail com `@` e qualquer senha.

## Como iniciar o Spring Boot

Pré-requisito: Java 21. Não é preciso instalar o Maven, o Maven Wrapper
(`mvnw`) baixa a versão certa sozinho.

```bash
cd backend-java
./mvnw spring-boot:run          # Linux, macOS ou Git Bash
.\mvnw.cmd spring-boot:run      # PowerShell / Windows
```

A aplicação sobe na porta 8080 e mostra `Started CtiInsightsApplication` no
terminal. Ainda não há endpoints (Controller), banco de dados nem JPA, como
previsto para esta Sprint.

Credenciais nunca vão para o repositório: use um arquivo `.env` local
(modelo em `backend-java/.env.example`, sem valores reais).

## Telas entregues

Fluxo: **Home pública → Login → área interna (Dashboard / Upload / Relatórios)**.

| Rota | Tela | O que faz |
|---|---|---|
| `/` | Home pública | Apresenta o CTI Insights, suas funcionalidades e o acesso ao Login. Sem a Sidebar. |
| `/login` | Login | Campos de e-mail e senha; simula o acesso à área interna. |
| `/dashboard` | Dashboard | KPIs, gráficos (faturamento por segmento, evolução das contratações, distribuição por nível A/B/C com curva ABC, top 5 serviços), painel de Insights Inteligentes, filtros por segmento, nível e período, e exportação CSV/PDF. |
| `/upload` | Upload | Seleção de planilha `.xlsx`/`.csv`, validação dos campos obrigatórios, histórico de processamento e prévia dos clientes tratados. |
| `/relatorios` | Relatórios | Base de clientes detalhada, com busca por empresa, filtro por período e paginação. |

A **Sidebar** da área interna tem links para Dashboard, Upload e Relatórios e a
opção de sair. O menu vira hambúrguer no celular. Os dados vêm da planilha
enviada no Upload e ficam guardados no navegador (`localStorage`), até existir
o back-end.

## Integrantes e responsabilidades

Grupo **Data Pulse**, ADS Turma B (CSTADS126N2).

| Integrante | Responsabilidade |
|---|---|
| Justino Ricardo Jairi Silvestre | Back-end (Java/Spring Boot) |
| Thyphanny Katherine Silva Franca | Front-end (Vue 3 / Tailwind CSS): telas de upload e dashboard |
| Miguel Herculano Viana | Dados (Python/Pandas): motor de tratamento e padronização |
| Ryan Vinicius da Silva | Banco de dados e nuvem: modelagem física e PostgreSQL |
| Simone Queiroz Batista | Gestão, SAGA e QA: organização do repositório, ambiente, pipeline e documentação |

## Evidências

Os registros de execução (telas, terminal do Front-End e do Spring Boot) estão
na pasta [`evidencias/`](evidencias/).

## Documentação

- Entrega da Sprint 1 e correção do professor: `01_Documentacao/Sprint_1/`
- Diagrama de classes: `02_Modelagem_e_Diagramas/`
- Protótipos (Figma): `03_Prototipos_UX_UI/`
- Detalhes do front-end: [`frontend-vue/README.md`](frontend-vue/README.md)
