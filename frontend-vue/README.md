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

Não há autenticação real. A tela `/login` aceita **qualquer e-mail válido
(com `@`) e qualquer senha**. Para testar de novo o estado "sem dados",
use o botão de limpar dados em **Relatórios**.

## Telas e rotas

| Rota | Tela | Acesso |
|---|---|---|
| `/` | Página inicial (landing) | Pública |
| `/login` | Login | Pública |
| `/upload` | Upload e histórico de processamento | Requer login |
| `/dashboard` | Dashboard executivo (KPIs, gráficos, insights, filtros por segmento, nível e período, exportação CSV/PDF) | Requer login |
| `/relatorios` | Base de clientes detalhada, com busca por empresa e filtro por período | Requer login |

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
│   └── periodo.js       # filtro por período de contratação (Dashboard e Relatórios)
├── views/            # uma por rota: Home, Login, UploadView, Dashboard, Relatorios
└── components/       # Sidebar e blocos da página inicial (Hero, Metrics, ...)
```

## Como os dados fluem hoje

1. No **Upload**, o arquivo é lido no navegador (`uploadStore.js`).
2. As linhas são **normalizadas** (espaços, maiúsculas, segmentos
   equivalentes como "IND." e "Indústria", faturamento em texto → número,
   datas `dd/mm/aaaa` → `aaaa-mm-dd`).
3. A planilha é **validada**: todo campo obrigatório (lista abaixo) precisa
   estar preenchido em **todas** as linhas. Se alguma falhar, o arquivo
   inteiro é recusado (`ERRO_SCHEMA`), a mensagem no histórico diz quais
   campos e quais linhas corrigir, e a última base válida é mantida.
4. O resultado é salvo pelo serviço (`services/api.js`, hoje no `localStorage`); Dashboard e Relatórios leem dele.

Chaves usadas no `localStorage`:

| Chave | Conteúdo |
|---|---|
| `ctiClientes` | Lista de clientes já normalizados (última base válida) |
| `ctiTelemetria` | Histórico de uploads (status, linhas lidas, mensagem) |
| `ctiAuth` | `"true"` quando há sessão simulada |
| `ctiUsuario` | E-mail digitado no login |

### Formato esperado da planilha

O **nome da coluna no cabeçalho precisa ser exatamente o da tabela** (minúsculas, com `_`). Colunas obrigatórias: se estiverem vazias ou inválidas em qualquer linha, o arquivo é recusado.

| Coluna | Obrigatória | Observação |
|---|---|---|
| `consultor` | Sim | Texto |
| `codigo_cliente` | Sim | Texto |
| `nome_cliente` | Sim | Texto |
| `segmento` | Sim | Grafias diferentes são unificadas |
| `nivel_cliente` | Sim | `A`, `B` ou `C` |
| `data_contratacao` | Sim | `aaaa-mm-dd` ou `dd/mm/aaaa`; data inválida também recusa o arquivo |
| `servicos_contratados` (ou `servico`) | Sim | Vários serviços separados por `;` |
| `faturamento_anual` (ou `faturamento`) | Não | Número ou texto como `R$ 1.850.000,00`; vazio conta como 0 |

Estados do histórico de upload: `PROCESSANDO`, `NORMALIZADO`, `ERRO_SCHEMA`.
Um registro que ficou em `PROCESSANDO` porque a página foi fechada é marcado
como interrompido na próxima vez que a tela de Upload abrir.

### Filtro por período

Dashboard e Relatórios têm os campos **De** e **Até**, que filtram pela **data
de contratação** (limites inclusivos; um dos dois pode ficar vazio). Com o
filtro ativo, clientes sem data ficam de fora. O faturamento exibido é o
**faturamento anual** de cada cliente contratado no período, não a receita
gerada nele. O filtro roda no navegador (`src/utils/periodo.js`).

### Testando o Upload

- Arquivos de exemplo com erros (campo obrigatório vazio, sem linhas etc.)
  ajudam a ver as mensagens do histórico.
- O status `PROCESSANDO` dura milissegundos. Para vê-lo, em **modo de
  desenvolvimento** (`npm run dev`) rode no console do navegador:
  `localStorage.setItem('ctiDelayUpload', 3000)` (espera 3 s por upload) e,
  para desligar, `localStorage.removeItem('ctiDelayUpload')`. No build de
  produção essa espera não existe.

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
persistência dos clientes e do histórico, e o nome/perfil do usuário (a
Sidebar mostra o e-mail e o cargo fixo "Consultor").

## Convenções

- Rodar `npm run lint` antes de abrir um Pull Request.
- Textos da interface em português; nomes de campos de dados em
  `snake_case`, como na planilha.
- Cores da marca: azul `#006EB7` e laranja `#FF8F00`. Para texto pequeno
  sobre fundo claro, usar `#A85700` (laranja) e `#4D7C0F` (verde), que
  têm contraste adequado.
