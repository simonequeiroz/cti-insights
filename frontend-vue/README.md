# CTI Insights — Front-end (Vue 3)

Interface web do CTI Insights: o usuário importa planilhas comerciais
(`.xlsx` / `.csv`), o sistema normaliza os dados e exibe um dashboard
executivo e uma base de clientes detalhada.

> **Estado atual:** o front-end funciona de forma **independente**, sem
> back-end. Autenticação e dados são simulados no navegador
> (`localStorage`). A integração com as demais squads (Java, Python,
> banco de dados) está descrita em [Integração com as outras squads](#integração-com-as-outras-squads).

## Stack

| Item | Tecnologia |
|---|---|
| Framework | Vue 3 (`<script setup>`) |
| Build / dev server | Vite |
| Estilo | Tailwind CSS 4 |
| Rotas | Vue Router |
| Estado | Pinia |
| Gráficos | Chart.js + vue-chartjs |
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

### Como entrar (protótipo)

Não há autenticação real (o back-end ainda não tem login). As contas ficam
salvas só neste navegador.

1. Crie uma conta em `/cadastro` (link **Criar conta** na tela de login):
   nome e sobrenome, e-mail, **papel** e senha de no mínimo 8 caracteres.
2. A **primeira conta** criada no navegador vira **Administrador** e já
   entra. As seguintes ficam **aguardando aprovação** e não conseguem fazer
   login.
3. Entre como Administrador e aprove (ou recuse) os cadastros em
   **Usuários** (`/usuarios`); dá para trocar o papel antes de aprovar.

O que cada papel pode fazer (regras em `src/utils/papeis.js`):

| Ação | Consultor | Gestor | Administrador |
|---|:---:|:---:|:---:|
| Dashboard, Relatórios e exportar CSV/PDF | ✅ | ✅ | ✅ |
| Importar planilha e ver histórico | ✅ | ❌ | ✅ |
| Remover item do histórico e limpar dados locais | ❌ | ❌ | ✅ |
| Aprovar cadastros (`/usuarios`) | ❌ | ❌ | ✅ |

Quem abre pelo endereço uma tela que o papel não permite volta ao
Dashboard com um aviso. Para testar de novo o estado "sem dados", use o
botão de limpar dados em **Relatórios** (Administrador).

## Telas e rotas

| Rota | Tela | Acesso |
|---|---|---|
| `/` | Página inicial (landing) | Pública |
| `/login` | Login | Pública |
| `/cadastro` | Cadastro (primeiro acesso) | Pública |
| `/upload` | Importar: envio da planilha em etapas e histórico de importações | Consultor e Administrador |
| `/dashboard` | Dashboard executivo (KPIs, gráficos, insights, filtros por segmento, nível e período, exportação CSV/PDF) | Requer login |
| `/relatorios` | Base de clientes detalhada, com busca por empresa e filtro por período | Requer login |
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
│   └── uploadStore.js   # leitura, limpeza e validação da planilha; histórico
├── utils/
│   ├── papeis.js        # papéis (Consultor, Gestor, Administrador) e permissões
│   ├── upsell.js        # regras de oportunidade de upsell do Dashboard
│   └── periodo.js       # filtro por período de contratação (Dashboard e Relatórios)
├── views/            # uma por rota: Home, Login, Cadastro, UploadView, Dashboard, Relatorios, Usuarios
└── components/       # Sidebar e blocos da página inicial (Hero, Metrics, ...)
```

## Como os dados fluem hoje

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
4. Ao confirmar, a base é atualizada pelo serviço (`services/api.js`, hoje
   no `localStorage`). Quem não veio na planilha **fica inativo**, em vez de
   ser apagado, e volta a ativo se aparecer em outra importação; quem já
   estava na base e veio com erro continua com os dados anteriores.
   Dashboard e Relatórios leem dessa base.

Chaves usadas no `localStorage`:

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
| `status_contrato` | Não | `Ativo` ou `Inativo` (`Cancelado` e `Encerrado` viram `Inativo`) |
| `data_fim_contrato` | Não | Término ou cancelamento; vazio se o contrato continua |

Estados do histórico de upload: `PROCESSANDO`, `NORMALIZADO`, `ERRO_SCHEMA`.
Um registro que ficou em `PROCESSANDO` porque a página foi fechada é marcado
como interrompido na próxima vez que a tela de Upload abrir.

### Filtro por período

Dashboard e Relatórios têm os campos **De** e **Até**, que filtram pela **data
de contratação** (limites inclusivos; um dos dois pode ficar vazio). Com o
filtro ativo, clientes sem data ficam de fora. O faturamento exibido é o
**faturamento anual** de cada cliente contratado no período, não a receita
gerada nele. O filtro roda no navegador (`src/utils/periodo.js`).

### Oportunidades de upsell

Calculadas em `src/utils/upsell.js`, comparando cada cliente com os demais do
mesmo segmento (segmentos com pelo menos 3 clientes):

1. **Poucos serviços para o porte:** faturamento acima da mediana do segmento
   e pelo menos 0,25 serviço abaixo da média dele.
2. **Serviço que falta:** o cliente não tem um serviço presente em pelo menos
   60% do segmento.
3. **Segmento com potencial** (hipótese H03): a participação nos serviços
   contratados supera a participação no faturamento em 5 pontos ou mais.

Só clientes ativos entram nessas regras.

### Contratos ativos e inativos

A situação vem de `status_contrato` e `data_fim_contrato`
(`src/utils/situacaoContrato.js`). A planilha deve trazer ativos e inativos
no mesmo arquivo:

- não veio numa importação posterior: **Inativo**, com o campo
  `saiu_da_planilha_em`. Essa é a data da importação, não a do cancelamento
  real, e a tela a identifica como "Saiu da planilha em";
- término em data passada: **Inativo**, mesmo que o status tenha sido
  preenchido antes de a data chegar; na importação, `Ativo` com término
  passado é erro;
- sem término vencido: vale o status; sem status, término futuro é **Ativo**;
- sem nenhuma das duas colunas: **Não informado**, contado como ativo, para
  planilhas sem esse dado continuarem funcionando.

Faturamento, clientes, serviços, ticket médio, gráficos de receita e nível, e
upsell usam só os ativos. A evolução das contratações, a tabela de clientes e
o CSV usam a carteira inteira. A situação é por cliente: cada linha da planilha
tem um único status, mesmo com vários serviços.

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
| `services/api.js` com Axios no futuro | Já existe em modo simulado, com `fetch`; o Axios entra com o back-end, na função `http` |

**Próxima etapa:** Vue → Pinia → Axios → Spring Boot → PostgreSQL no Neon.
O Vue não acessa o banco diretamente; quem grava é o Spring Boot.

## Integração com as outras squads

Telas, stores e a guarda de rota **não** acessam `localStorage` nem
`fetch` diretamente: tudo passa por [src/services/api.js](src/services/api.js).
Hoje essas funções simulam o back-end no navegador (modo mock). Para ligar
a API real, troca-se o comportamento dentro desse arquivo; as telas não
mudam.

| Item | Situação |
|---|---|
| Camada de acesso a dados (`src/services/api.js`) | Pronta (modo mock) |
| Alternância mock/API por variável de ambiente (`.env.example`) | Pronta |
| Proxy `/api` no Vite (aponta para `localhost:8080`) | Pronto |
| Contrato dos endpoints ([API-CONTRATO.md](API-CONTRATO.md)) | **Proposta**, a validar com as squads |
| Chamadas reais à API (`VITE_USE_MOCK=false`) | Escritas, **nunca testadas** contra um back-end |
| Envio da planilha ao back-end (`POST /uploads`) | Não implementado |

Para usar a API quando ela existir:

```bash
cp .env.example .env     # depois edite: VITE_USE_MOCK=false
npm run dev
```

**Decisões pendentes com as squads** (detalhes em
[API-CONTRATO.md](API-CONTRATO.md)):

1. Quem valida e limpa a planilha: hoje o front faz isso; o ideal é o
   back-end/Python fazer, e o front só exibir status, linhas lidas e erros.
2. Tipo de autenticação (cookie de sessão ou token).
3. Nomes finais dos campos, conforme o schema do banco.

Continuam simulados até o back-end existir: login (autenticação real),
cadastro e aprovação de usuários, e persistência dos clientes e do
histórico. As permissões por papel hoje só escondem telas e botões no
front; o back-end precisa aplicar as mesmas regras em cada endpoint.

## Convenções

- Rodar `npm run lint` antes de abrir um Pull Request.
- Textos da interface em português; nomes de campos de dados em
  `snake_case`, como na planilha.
- Cores da marca: azul `#006EB7` e laranja `#FF8F00`. Para texto pequeno
  sobre fundo claro, usar `#A85700` (laranja) e `#4D7C0F` (verde), que
  têm contraste adequado.
