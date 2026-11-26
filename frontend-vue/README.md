# CTI Insights — Front-end (Vue 3)

Interface web do CTI Insights: o usuário importa planilhas comerciais
(`.xlsx` / `.csv`), o sistema normaliza os dados e exibe um dashboard
executivo e uma base de clientes detalhada.

> **Estado atual:** integrado ao back-end. Com `VITE_USE_MOCK=false`, o
> login, o upload, o dashboard e os relatórios usam a API do Spring Boot,
> que grava no PostgreSQL do Neon. O modo simulado (`VITE_USE_MOCK=true`)
> continua disponível para ver as telas sem back-end. Detalhes em
> [Integração com as outras squads](#integração-com-as-outras-squads).

## Stack

| Item | Tecnologia |
|---|---|
| Framework | Vue 3 (`<script setup>`) |
| Build / dev server | Vite |
| Estilo | Tailwind CSS 4 |
| Rotas | Vue Router |
| Estado | Pinia |
| Gráficos | Chart.js + vue-chartjs |
| Chamadas à API | Axios |
| Leitura de planilhas | SheetJS (`xlsx`) |
| Qualidade | ESLint + Prettier |

## Como rodar

Pré-requisito: Node.js recente (20.19+ ou 22.12+) e npm.

```bash
cd frontend-vue
npm install
npm run dev        # servidor de desenvolvimento (http://localhost:5173)
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarga automática |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Serve localmente o build de produção |
| `npm run lint` | Verifica o código com ESLint |
| `npm run format` | Formata `src/` com Prettier |

### Como entrar

**Com o back-end (`VITE_USE_MOCK=false`):** entre com o administrador
definido em `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env` do Spring. Novas
contas são criadas em `/cadastro` e ficam aguardando a aprovação de um
Administrador em **Usuários**. Quem guarda as contas é o Spring, no banco.

**No modo simulado (`VITE_USE_MOCK=true`):** as contas ficam salvas só
neste navegador.

**Conta de demonstração** (para apresentação e testes): e-mail
`admin@ctiinsights.com`, senha `cti12345`, papel Administrador. Na tela de
login, o link **Entrar com a conta de demonstração** entra com ela em um
clique. Ela existe sempre no modo simulado: se for apagada ou recusada, volta na próxima tentativa de login.
Com o back-end ligado (`VITE_USE_MOCK=false`), ela não existe
(`CONTA_DEMO` em `src/services/api.js`).

1. Crie uma conta em `/cadastro` (link **Criar conta** na tela de login):
   nome e sobrenome, e-mail, **papel** e senha de no mínimo 8 caracteres.
2. Se ainda não existir nenhuma conta no navegador, a primeira criada vira
   **Administrador** e já entra. Depois que a conta de demonstração existe, os
   novos cadastros ficam **aguardando aprovação** e não conseguem fazer login.
3. Entre como Administrador e aprove (ou recuse) os cadastros em
   **Usuários** (`/usuarios`); dá para trocar o papel antes de aprovar.

O que cada papel pode fazer (regras em `src/utils/papeis.js`):

| Ação | Consultor | Gestor | Administrador |
|---|:---:|:---:|:---:|
| Dashboard, Clientes e exportar CSV/PDF | ✅ | ✅ | ✅ |
| Importar planilha e ver histórico | ✅ | ❌ | ✅ |
| Incluir e editar cliente (tela Clientes) | ✅ | ❌ | ✅ |
| Excluir cliente (tela Clientes) | ❌ | ❌ | ✅ |
| Remover item do histórico e limpar dados locais | ❌ | ❌ | ✅ |
| Aprovar cadastros (`/usuarios`) | ❌ | ❌ | ✅ |

Quem abre pelo endereço uma tela que o papel não permite volta ao
Dashboard com um aviso. Para testar de novo o estado "sem dados", use o
botão de limpar dados em **Clientes** (Administrador).

## Telas e rotas

| Rota | Tela | Acesso |
|---|---|---|
| `/` | Página inicial (landing) | Pública |
| `/login` | Login | Pública |
| `/cadastro` | Cadastro (primeiro acesso) | Pública |
| `/upload` | Importar: envio da planilha em etapas e histórico de importações | Consultor e Administrador |
| `/dashboard` | Dashboard executivo (KPIs, gráficos, insights, filtros por segmento, nível e período, exportação CSV/PDF) | Requer login |
| `/relatorios` | Clientes: busca por empresa, código ou consultor; filtros de segmento, nível, consultor e período; ordenação; selo de upsell; exportação CSV; inclusão, edição e exclusão | Requer login |
| `/usuarios` | Aprovação de cadastros e papel de cada usuário | Administrador |

## Estrutura de `src/`

```
src/
├── main.js           # inicialização (Vue, Pinia, Router)
├── style.css         # Tailwind + estilos globais (fundo quadriculado)
├── router/index.js   # rotas e guarda de autenticação
├── services/
│   └── api.js        # ÚNICO ponto de acesso a dados e sessão (mock ou API)
├── stores/
│   ├── authStore.js     # sessão, login, cadastro e papel do usuário
│   ├── clientesStore.js # carteira de clientes (Dashboard e Clientes)
│   └── uploadStore.js   # leitura, limpeza e validação da planilha; histórico
├── utils/
│   ├── papeis.js        # papéis (Consultor, Gestor, Administrador) e permissões
│   ├── upsell.js        # regras de oportunidade de upsell do Dashboard
│   └── periodo.js       # filtro por período de contratação (Dashboard e Clientes)
├── views/            # uma por rota: Home, Login, Cadastro, UploadView, Dashboard, Relatorios, Usuarios
└── components/       # Sidebar, CardIndicador (KPIs), etapas da importação e blocos da página inicial
```

## Como os dados fluem

1. Na tela **Importar** (rota `/upload`), o arquivo é lido no navegador
   (`utils/etl.js`, chamado pelo `uploadStore.js`). Se o arquivo não abrir,
   estiver vazio ou não tiver uma coluna obrigatória, ele é recusado
   (`ERRO_SCHEMA`), o motivo fica no histórico e a base atual não muda.
2. As linhas são **normalizadas** (espaços, maiúsculas, segmentos
   equivalentes como "IND." e "Indústria", faturamento em texto → número,
   datas `dd/mm/aaaa` → `aaaa-mm-dd`). Segmento fora da lista conhecida
   entra como veio, com um aviso para conferência na revisão.
3. Cada linha é **validada** pelo dicionário de dados. Linhas com erro não
   entram e podem ser baixadas para correção; as demais seguem para a
   revisão. A regra está em `PERMITIR_IMPORTACAO_PARCIAL` (`uploadStore.js`).
4. Ao confirmar, as linhas válidas vão ao Spring (`POST /api/uploads`), que
   chama o Python e grava no banco. No modo simulado, ficam no
   `localStorage`. As linhas **substituem a carteira anterior**: cada planilha enviada é a
   carteira completa naquele momento. Antes de confirmar, a tela avisa quais
   clientes da carteira atual não estão na planilha nova. Dashboard e
   Clientes leem dessa carteira. O sistema não trata clientes ativos ou
   inativos.

Chaves usadas no `localStorage` (no modo API, só as de sessão):

| Chave | Conteúdo |
|---|---|
| `ctiClientes` | Lista de clientes já normalizados (última base válida) |
| `ctiTelemetria` | Histórico de uploads (status, linhas lidas, mensagem) |
| `ctiAuth` | `"true"` quando há sessão simulada |
| `ctiUsuario` | E-mail digitado no login |
| `ctiNome` | Nome da conta logada (exibido na Sidebar) |
| `ctiPapel` | Papel da conta logada (`CONSULTOR`, `GESTOR` ou `ADMINISTRADOR`) |
| `ctiContas` | Contas criadas no cadastro (nome, e-mail, SHA-256 da senha, papel e situação da aprovação) |

### Formato esperado da planilha

O **nome da coluna no cabeçalho precisa ser exatamente o da tabela** (minúsculas, com `_`). Em arquivos Excel, é usada a aba `Clientes` ou `upload_clientes`; sem elas, a primeira aba.

| Coluna | Obrigatória | Observação |
|---|---|---|
| `consultor` | Sim | Texto |
| `codigo_cliente` | Sim | Texto; não pode repetir (vale a primeira ocorrência) |
| `nome_cliente` | Sim | Texto |
| `segmento` | Sim | Grafias diferentes são unificadas |
| `nivel_cliente` | Sim | `A`, `B` ou `C` |
| `data_contratacao` | Sim | `aaaa-mm-dd` ou `dd/mm/aaaa` |
| `servicos_contratados` (ou `servico`) | Sim | Vários serviços separados por `;` |
| `faturamento_anual` (ou `faturamento`) | Sim | Número ou texto como `R$ 1.850.000,00`; sem valor negativo |
| `cidade` | Não | Texto |
| `uf` | Não | Sigla com 2 letras |

Estados do histórico de upload: `PROCESSANDO`, `NORMALIZADO`, `ERRO_SCHEMA`.
Um registro que ficou em `PROCESSANDO` porque a página foi fechada é marcado
como interrompido na próxima vez que a tela de Upload abrir.

### Filtro por período

Dashboard e Clientes têm os campos **De** e **Até**, que filtram pela **data
de contratação** (limites inclusivos; um dos dois pode ficar vazio). Com o
filtro ativo, clientes sem data ficam de fora. O faturamento exibido é o
**faturamento anual** de cada cliente contratado no período, não a receita
gerada nele. O filtro roda no navegador (`src/utils/periodo.js`).

### Oportunidades de upsell

Calculadas em `src/utils/upsell.js` (as mesmas regras estão no Python, em
`analytics-python/upsell.py`, que passa a ser a fonte quando o back-end
estiver ligado), comparando cada cliente com os demais do
mesmo segmento (segmentos com pelo menos 3 clientes):

1. **Poucos serviços para o porte:** faturamento acima da mediana do segmento
   e pelo menos 0,25 serviço abaixo da média dele.
2. **Serviço que falta:** o cliente não tem um serviço presente em pelo menos
   60% do segmento.
3. **Segmento com potencial** (hipótese H03): a participação nos serviços
   contratados supera a participação no faturamento em 5 pontos ou mais.

### Testando o Upload

- Arquivos de exemplo com erros (campo obrigatório vazio, sem linhas etc.)
  ajudam a ver as mensagens do histórico.
- O status `PROCESSANDO` dura milissegundos. Para vê-lo, em **modo de
  desenvolvimento** (`npm run dev`) rode no console do navegador:
  `localStorage.setItem('ctiDelayUpload', 3000)` (espera 3 s por upload) e,
  para desligar, `localStorage.removeItem('ctiDelayUpload')`. No build de
  produção essa espera não existe.

### Correspondência com a aula de Upload (Vue 3 + Pinia)

| Na aula | Neste projeto |
|---|---|
| `processarPlanilha()` | `analisarPlanilha()` no `uploadStore.js` |
| `tratarLinha()` no store | `tratarLinha()` em `utils/etl.js`, chamada pelo store |
| `dadosOriginais` / `dadosTratados` | `analise` (`validos` e `linhasComErro`) |
| Getters `totalClientes`, `totalErros`, `clientesNivelA`, `temDados` | Mesmos nomes, no `uploadStore.js` |
| Formulário em `UploadView.vue` | `UploadView.vue` conduz as etapas em `components/importacao/` |
| `services/api.js` com Axios | Função `http` em `services/api.js`, com mensagens de erro amigáveis |

Caminho dos dados: Vue → Pinia → Axios → Spring Boot → PostgreSQL no Neon.
O Vue não acessa o banco diretamente; quem grava é o Spring Boot.

## Integração com as outras squads

Telas, stores e a guarda de rota **não** acessam `localStorage` nem
chamam a API diretamente: tudo passa por [src/services/api.js](src/services/api.js).
No modo API, as chamadas usam **Axios** com o cookie da sessão e o token
CSRF do Spring.

| Item | Situação |
|---|---|
| Camada de acesso a dados (`src/services/api.js`) com Axios | Pronta e testada contra o Spring |
| Alternância mock/API por variável de ambiente (`.env.example`) | Pronta |
| Proxy `/api` no Vite (aponta para `localhost:8080`) | Pronto |
| Login, cadastro e aprovação de usuários reais | Prontos |
| Envio da planilha ao back-end (`POST /uploads`) | Pronto |
| Dashboard com os dados do Python (`GET /dashboard`) | Pronto |
| Sessão expirada (401) volta ao login | Pronto |

**Tratamento de erros:** a tela sempre mostra uma mensagem em português.
Se o Spring explicar o motivo (campo `mensagem`), ela aparece. Sem isso, a
mensagem depende da falha: servidor fora do ar ("Não foi possível falar
com o servidor"), demora acima de 90 s, erro interno (5xx), falta de
permissão (403) ou dado não encontrado (404). No login, só o 401 vira
"E-mail ou senha inválidos".

Para usar a API:

```bash
cp .env.example .env     # depois edite: VITE_USE_MOCK=false
npm run dev
```

Os três serviços (Python, Spring e Vue) precisam estar ligados. Veja o
passo a passo no [README da raiz](../README.md#como-executar).

As permissões por papel escondem telas e botões no front, e o Spring
aplica as mesmas regras em cada rota.

## Convenções

- Rodar `npm run lint` antes de abrir um Pull Request.
- Textos da interface em português; nomes de campos de dados em
  `snake_case`, como na planilha.
- Cores da marca: azul `#006EB7` e laranja `#FF8F00`. Para texto pequeno
  sobre fundo claro, usar `#A85700` (laranja) e `#4D7C0F` (verde), que
  têm contraste adequado.
