# Contrato da API — proposta do front-end

> **Status: PROPOSTA.** Descreve o que o front-end espera hoje, deduzido
> dos dados que ele já usa. Deve ser **revisado e aprovado** pelas squads
> de Java (Spring Boot) e de dados (Python/Pandas). Ainda não foi testado
> contra um back-end real. Se o back-end precisar de outro formato, o
> ajuste é feito em um único arquivo do front: `src/services/api.js`.

Base da API: `VITE_API_URL` (padrão `/api`), ou seja, `GET /clientes` é
`GET /api/clientes`. Formato: JSON. Datas de calendário: `aaaa-mm-dd`. Data e
hora: ISO 8601.

O caminho completo dos dados (front → Spring → Python → banco → front) e o que
cada parte faz estão em `docs/FLUXO-DO-SISTEMA.md`.

## Decisões do grupo sobre o diagrama de classes

O grupo decidiu ajustar o diagrama de classes
(`02_Modelagem_e_Diagramas/diagrama-de-classes-cti-insights.png`) nestes
pontos. **O diagrama ainda precisa ser atualizado** e os nomes exatos dos
campos novos abaixo são sugestão, a confirmar:

| # | Ajuste | Motivo |
|---|---|---|
| 1 | Acrescentar `nome: String` em **Cliente** | O front exibe e busca por nome da empresa; a planilha traz `nome_cliente` |
| 2 | Acrescentar um campo numérico de faturamento (sugestão: `faturamentoAnual: BigDecimal`), mantendo `faixaFaturamentoAnual` se quiserem | O Dashboard soma faturamento, calcula ticket médio e faturamento por segmento; com faixa em texto isso não é possível |
| 3 | **Telemetria** deixa de se ligar a **Cliente** (sugestão: liga-se ao **Consultor** que enviou o arquivo, ou fica sem ligação) | Cada registro é um arquivo enviado, que contém muitos clientes |
| 4 | Acrescentar `linhasLidas: Integer` em **Telemetria** | A tabela do Upload exibe as linhas lidas |
| 5 | Acrescentar a classe **Usuario** (nome, email, senhaHash, papel, papelSolicitado, status, criadoEm, avaliadoEm, avaliadoPor); **Telemetria** liga-se ao Usuario que enviou o arquivo | Login e papéis; o Consultor só tem nome e email |
| 6 | Acrescentar a classe **Estatistica** (telemetria, geradoEm, resultado em JSON) | Guarda o que o ETL em Python calcula para cada envio: média, mediana, desvio padrão e os dados dos gráficos |
| 7 | **Insight** ganha a ligação com a **Telemetria**; `cliente` fica opcional | O ETL grava uma frase por linha, ligada ao envio; frases gerais não têm cliente |
| 8 | Manter `faixaFaturamentoAnual` em **Cliente**, opcional | Pedido do professor; a planilha não traz esse dado |
| 9 | **Cliente** liga-se à **Telemetria** do envio em que veio | Cada planilha enviada é a carteira completa naquele momento; o sistema mostra o envio mais recente |
| 10 | Sem clientes ativos ou inativos: `Contrato.status` e `dataFim` ficam opcionais e sem regra | Orientação da professora: o foco é faturamento, serviços, tipo de cliente e upsell |

As tabelas que correspondem a essas classes estão em `database/README.md`.

### Mapeamento planilha → modelo

| Coluna da planilha | Entidade.campo |
|---|---|
| `consultor` | Consultor.nome |
| `codigo_cliente` | Cliente.codigo |
| `nome_cliente` | Cliente.nome (novo) |
| `segmento` | Cliente.segmento |
| `nivel_cliente` | Cliente.nivel |
| `faturamento_anual` | Cliente.faturamentoAnual (novo) |
| `data_contratacao` | Contrato.dataInicio |
| `servicos_contratados` | Servico.nome (vários, separados por `;`) |

## Pontos decididos

1. **Quem valida e limpa a planilha:** o front (Pinia) lê e valida e envia
   ao Spring só as linhas válidas, em JSON (`POST /uploads`). O Spring valida
   de novo (DTO + Service) e chama o Python, que padroniza e calcula. O arquivo
   não é enviado ao back-end.
2. **Usuário:** classe nova `Usuario`, separada do Consultor (decisão 5).
3. **Insights, estatísticas e upsell:** calculados pelo Python e entregues em
   `GET /dashboard`.
4. **Um contrato por cliente**, como a planilha traz.
5. **Sem ativo/inativo** (decisão 10).

## Pontos em aberto (decidir em conjunto)

1. **Autenticação:** token (JWT) ou sessão por cookie.
2. **Nomes de campos:** o diagrama usa `camelCase` (Java) e o front usa
   `snake_case` (planilha). O front adapta o formato em `src/services/api.js`,
   então o back-end pode manter `camelCase`; só é preciso combinar os nomes.
3. **Papel do usuário (decidido no front):** `CONSULTOR`, `GESTOR` ou
   `ADMINISTRADOR`, escolhido no cadastro e aprovado por um Administrador.
   Regras em `src/utils/papeis.js`: todos consultam e exportam; Consultor
   também importa planilhas; Gestor só acompanha os resultados; Administrador
   importa, aprova cadastros e apaga dados/histórico. O back-end precisa
   aplicar as **mesmas regras em cada endpoint** (o front só esconde telas e
   botões).
4. **Faturamento por serviço:** com Contrato N—N Serviço e um único
   `valor`, o gráfico "Top 5 Serviços por Faturamento" hoje divide o valor
   igualmente entre os serviços. Definir se isso é aceitável ou se há
   valor por serviço.

## Autenticação

### `POST /auth/login`

Requisição:

```json
{ "email": "usuario@empresa.com", "senha": "..." }
```

Resposta `200`:

```json
{ "email": "usuario@empresa.com", "nome": "Ana Lima", "papel": "GESTOR" }
```

`papel` é obrigatório: define o menu e os botões que o front mostra. `nome`
é opcional: sem ele, o front deriva o nome do e-mail (`ana.lima@…` → "Ana
Lima").

Erros:

- `401`: credenciais inválidas (o front mostra "E-mail ou senha inválidos.").
- `403` com `{ "codigo": "PENDENTE" }`: cadastro ainda não aprovado.
- `403` com `{ "codigo": "REJEITADO" }`: cadastro recusado.

### `POST /auth/cadastro`

Primeiro acesso (tela `/cadastro`). Requisição:

```json
{ "nome": "Ana Lima", "email": "usuario@empresa.com", "senha": "...", "papel": "GESTOR" }
```

Resposta `201`:

```json
{ "id": 7, "nome": "Ana Lima", "email": "usuario@empresa.com", "papel": "GESTOR", "papelSolicitado": "GESTOR", "status": "PENDENTE", "criadoEm": "2026-10-29T16:28:00Z", "avaliadoEm": null, "avaliadoPor": null }
```

O cadastro nasce `PENDENTE` e só pode fazer login depois que um
Administrador aprovar (`PATCH /usuarios/{id}`). **Exceção:** se ainda não
existe nenhum usuário, a conta nasce `ADMINISTRADOR` e `APROVADO` (senão
ninguém aprovaria os outros); nesse caso o front já faz o login em seguida.

O front valida antes de enviar (nome e sobrenome, e-mail com `@`, papel
escolhido, senha com no mínimo 8 caracteres e confirmação igual); o
back-end deve validar de novo e guardar a senha com hash (ex.: BCrypt),
nunca em texto.

**Segurança:** no protótipo qualquer pessoa pode *pedir* o papel de
Administrador; o pedido só vale depois da aprovação de outro Administrador,
que pode trocar o papel antes de aprovar.

Erro `409`: e-mail já cadastrado (o front mostra "Este e-mail já tem
cadastro. Faça login para entrar.").

### `POST /auth/logout`

Sem corpo. Resposta `204`.

## Usuários (só Administrador)

Tela `/usuarios`. Os dois endpoints devem responder `403` para quem não é
`ADMINISTRADOR`.

### `GET /usuarios`

Lista todos os cadastros (sem a senha), no mesmo formato da resposta de
`POST /auth/cadastro`. `avaliadoPor` é `{ "nome": "...", "email": "..." }`
de quem aprovou/recusou.

### `PATCH /usuarios/{id}`

Aprova ou recusa um cadastro; o Administrador pode trocar o papel pedido.

```json
{ "status": "APROVADO", "papel": "CONSULTOR" }
```

`status`: `APROVADO` ou `REJEITADO` (um recusado pode ser aprovado depois).
Resposta `200` com o usuário atualizado; o back-end preenche `avaliadoEm` e
`avaliadoPor` com quem está logado.

## Clientes

### `GET /clientes`

Devolve os clientes do envio mais recente com status `NORMALIZADO` (tela
Relatórios). Resposta `200`:

```json
[
  {
    "consultor": "Ana Lima",
    "codigo_cliente": "C001",
    "nome_cliente": "Alfa Ltda",
    "segmento": "Indústria",
    "nivel_cliente": "A",
    "faturamento": 1850000.0,
    "data_contratacao": "2025-03-15",
    "servico": "Internet Dedicada, Firewall",
    "servicos": ["Internet Dedicada", "Firewall"]
  }
]
```

O formato abaixo é o que o front usa internamente (`snake_case`). Ele
resulta de juntar Cliente, Consultor, Contrato e Serviço numa linha por
cliente; se a API devolver outra estrutura, a conversão é feita em
`src/services/api.js`.

| Campo | Tipo | Observações |
|---|---|---|
| `consultor` | texto | Consultor.nome; vazio se não informado |
| `codigo_cliente` | texto | |
| `nome_cliente` | texto | |
| `segmento` | texto | Já normalizado (ex.: "IND." e "Industria" → "Indústria") |
| `nivel_cliente` | `"A"`, `"B"` ou `"C"` | |
| `faturamento` | número ou `null` | Em reais, sem formatação |
| `data_contratacao` | `aaaa-mm-dd` ou `null` | |
| `servico` | texto ou `null` | Serviços juntos, separados por vírgula (para exibir) |
| `servicos` | lista de texto | Os mesmos serviços, um por item (para contar) |

Lista vazia `[]` quando ainda não há base importada.

## Upload e histórico de processamento

### `GET /uploads`

Histórico de arquivos enviados, do mais recente para o mais antigo.
Resposta `200`:

```json
[
  {
    "id": 1735000000000,
    "tipoOperacao": "UPLOAD",
    "nomeArquivo": "clientes.xlsx",
    "dataHora": "2026-05-04T14:38:00.000Z",
    "status": "NORMALIZADO",
    "linhasLidas": 1450,
    "mensagem": ""
  }
]
```

Cada item corresponde a um registro de **Telemetria** do diagrama (com o
campo `linhasLidas`, acrescentado por decisão do grupo).

| Campo | Valores / observações |
|---|---|
| `status` | `PROCESSANDO`, `NORMALIZADO`, `ERRO_SCHEMA` (planilha recusada) ou `ERRO_ETL` (planilha aceita, mas o ETL em Python falhou) |
| `linhasLidas` | número, ou `null` enquanto `PROCESSANDO` |
| `mensagem` | Motivo do erro quando `ERRO_SCHEMA` ou `ERRO_ETL`; vazio caso contrário |

Regra de negócio importante: um envio com erro (`ERRO_SCHEMA` ou
`ERRO_ETL`) **não muda** o que o sistema mostra. Dashboard e Relatórios usam
sempre o envio mais recente com status `NORMALIZADO`.

### Regras de validação da planilha

Aplicadas no front (Pinia), antes do envio, e de novo no Spring (DTO +
Service). Linhas com erro não são enviadas; as demais seguem. O arquivo inteiro
é recusado (`ERRO_SCHEMA`) só quando não abre, está vazio ou não tem uma coluna
obrigatória.

| Campo | Regra |
|---|---|
| `codigo_cliente` | Preenchido; não pode repetir no mesmo arquivo (vale a primeira ocorrência) |
| `nome_cliente`, `consultor`, `segmento` | Preenchidos |
| `nivel_cliente` | `A`, `B` ou `C` |
| `faturamento_anual` | Número, sem valor negativo (aceita texto como `R$ 1.850.000,00`) |
| `data_contratacao` | Data válida (`aaaa-mm-dd` ou `dd/mm/aaaa`) |
| `servicos_contratados` | Pelo menos um serviço (vários separados por `;`) |
| `cidade`, `uf` | Opcionais; `uf` com 2 letras |

### Filtro por período

Dashboard e Relatórios filtram por **data de contratação** (`De`/`Até`) no
próprio navegador, sobre a lista devolvida por `GET /clientes`. Se a base
crescer, o filtro pode virar parâmetro da API (por exemplo,
`GET /clientes?de=aaaa-mm-dd&ate=aaaa-mm-dd`); isso é uma sugestão, não uma
exigência.

### `POST /uploads`

Envio das linhas **já validadas pelo front**, em JSON:

```json
{
  "nomeArquivo": "clientes.xlsx",
  "linhasLidas": 38,
  "linhas": [
    {
      "codigo_cliente": "CTI001",
      "nome_cliente": "Metalúrgica Horizonte",
      "consultor": "Ana Souza",
      "segmento": "Indústria",
      "nivel_cliente": "A",
      "faturamento_anual": 1850000,
      "servicos_contratados": "Internet Dedicada;Firewall",
      "data_contratacao": "2025-01-15",
      "cidade": "Campinas",
      "uf": "SP"
    }
  ]
}
```

O Spring valida de novo, grava o envio em **Telemetria** com status
`PROCESSANDO` e responde `201` com o envio (mesmo formato de um item de
`GET /uploads`). Depois chama o Python (`POST /etl`, abaixo). Se a validação
do Spring recusar o envio, responde `400` com a `mensagem`.

O front consulta `GET /uploads` (ou `GET /dashboard`) a cada poucos segundos
até o status mudar para `NORMALIZADO` ou `ERRO_ETL`.

### `GET /dashboard`

Resultado calculado pelo Python para o envio mais recente com status
`NORMALIZADO`. Resposta `200`:

```json
{
  "envio": { "id": 7, "nomeArquivo": "clientes.xlsx", "status": "NORMALIZADO", "linhasLidas": 38 },
  "geradoEm": "2026-11-12T19:10:00Z",
  "estatisticas": {
    "resumo": { "totalClientes": 32, "faturamentoTotal": 72360000, "media": 2261250, "mediana": 1470000 },
    "porSegmento": [], "porNivel": [], "porConsultor": [], "porServico": [], "porMes": [],
    "correlacao": {}, "topClientes": [], "qualidade": {},
    "upsell": {
      "oportunidades": [
        {
          "codigo": "CTI035", "nome": "Fábrica Nacional", "segmento": "Indústria", "nivel": "A",
          "consultor": "Ana Souza", "faturamento": 5450000, "servicos": ["MPLS", "Firewall"],
          "motivos": ["Faturamento acima da mediana do segmento, com poucos serviços (2 contra média de 2,4)"]
        }
      ],
      "segmentoPotencial": { "segmento": "Educação", "participacaoServicos": 11.5, "participacaoFaturamento": 5.9, "diferenca": 5.6 }
    }
  },
  "insights": ["O segmento Comércio concentra a maior carteira: ..."]
}
```

`estatisticas` é exatamente o JSON gravado pelo Python em
`estatistica.resultado`; `insights` são as frases da tabela `insight`. Sem
nenhum envio processado, responde `404`.

`estatisticas.upsell` traz as oportunidades de upsell calculadas pelo Python
(`analytics-python/upsell.py`), do maior para o menor faturamento, e o
`segmentoPotencial` (`null` quando nenhum segmento se destaca). As regras são
as mesmas que o front usava em `src/utils/upsell.js`.

## Spring → Python (uso interno)

### `POST /etl` (API do Python, `analytics-python/api.py`)

Chamado pelo Spring depois de gravar o envio. O front não usa esta rota.

```json
{ "telemetriaId": 7, "recebidas": 38, "linhas": [ { "codigo_cliente": "CTI001" } ] }
```

Cabeçalho `X-ETL-Key` com a chave combinada (`ETL_API_KEY` no Python).
Resposta `200` `{ "ok": true, "telemetriaId": 7 }`. Em caso de falha, o Python
marca o envio como `ERRO_ETL` e responde `500`; se o Python estiver desligado,
o Spring marca `ERRO_ETL`.

## Códigos de erro

Erros devem vir com status HTTP adequado (`400`, `401`, `404`, `500`) e,
quando possível, um corpo `{ "mensagem": "texto para o usuário" }`.
