# Contrato da API — proposta do front-end

> **Status: PROPOSTA.** Descreve o que o front-end espera hoje, deduzido
> dos dados que ele já usa. Deve ser **revisado e aprovado** pelas squads
> de Java (Spring Boot) e de dados (Python/Pandas). Ainda não foi testado
> contra um back-end real. Se o back-end precisar de outro formato, o
> ajuste é feito em um único arquivo do front: `src/services/api.js`.

Base da API: `VITE_API_URL` (padrão `/api`). Formato: JSON, exceto o envio
de planilha. Datas de calendário: `aaaa-mm-dd`. Data e hora: ISO 8601.

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

## Pontos em aberto (decidir em conjunto)

1. **Quem valida e limpa a planilha?** Hoje o front normaliza (segmentos,
   faturamento, datas) e valida (sem linhas, ou linha sem nome e sem
   código). O ideal é o Python/Pandas fazer isso e o front só exibir o
   resultado. Isso define se o `POST /uploads` abaixo recebe o arquivo
   bruto (recomendado) ou os clientes já tratados.
2. **Autenticação:** sessão por cookie ou token (JWT)? O diagrama não tem
   entidade de usuário/senha (o Consultor só tem `nome` e `email`); definir
   se o login usa o Consultor ou uma entidade nova.
3. **Nomes de campos:** o diagrama usa `camelCase` (Java) e o front usa
   `snake_case` (planilha). O front adapta o formato em `src/services/api.js`,
   então o back-end pode manter `camelCase`; só é preciso combinar os nomes.
   O `database/schema.sql` ainda está vazio.
4. **Perfil do usuário:** a Sidebar mostra o e-mail e o cargo fixo
   "Consultor". Se a API devolver nome e perfil, o front passa a exibi-los.
5. **Insights:** o diagrama tem `Insight` por cliente, mas o front hoje
   calcula insights **agregados** (ex.: "60% do faturamento está na Classe
   A"). Definir se o back-end/Python vai gerar os insights (`GET /insights`)
   e em que formato.
6. **Vários contratos por cliente:** o diagrama permite (Cliente 1—N
   Contrato), mas o front assume uma linha por cliente com uma única
   `data_contratacao`. Se houver vários, `GET /clientes` deve incluir a
   lista de contratos; "Evolução das contratações" passaria a contar
   contratos, e não clientes.
7. **Status do contrato:** o diagrama tem `Contrato.status` e `dataFim`. O
   front hoje **infere** "Ativo/Inativo" (assinado nos últimos 12 meses); com
   o status real vindo da API, essa inferência sai.
8. **Faturamento por serviço:** com Contrato N—N Serviço e um único
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
{ "email": "usuario@empresa.com" }
```

Erro `401`: credenciais inválidas (o front mostra "E-mail ou senha
inválidos.").

### `POST /auth/logout`

Sem corpo. Resposta `204`.

## Clientes

### `GET /clientes`

Devolve a base de clientes válida mais recente. Resposta `200`:

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
| `status` | `PROCESSANDO`, `NORMALIZADO` ou `ERRO_SCHEMA` |
| `linhasLidas` | número, ou `null` enquanto `PROCESSANDO` |
| `mensagem` | Motivo do erro quando `ERRO_SCHEMA`; vazio caso contrário |

Regra de negócio importante: um upload com `ERRO_SCHEMA` **não deve
substituir** a última base válida servida por `GET /clientes`.

### `POST /uploads` (a definir)

Envio da planilha (`multipart/form-data`, campo `arquivo`, `.xlsx`/`.xls`/
`.csv`). Deve criar o registro do histórico com `PROCESSANDO` e atualizá-lo
para `NORMALIZADO` ou `ERRO_SCHEMA` ao terminar. Quando o processamento for
assíncrono no back-end, o front consultará `GET /uploads` até o status
mudar (ou usará outro mecanismo combinado).

> **Ainda não implementado no front:** hoje o front lê e trata a planilha
> localmente. Ligar este endpoint depende do ponto em aberto nº 1.

## Códigos de erro

Erros devem vir com status HTTP adequado (`400`, `401`, `404`, `500`) e,
quando possível, um corpo `{ "mensagem": "texto para o usuário" }`.
