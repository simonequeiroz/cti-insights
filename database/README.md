# Banco de dados — como começar

O arquivo `schema.sql` é a versão inicial (V1) do esquema compartilhado
pelo Spring/JDBC e pelo FastAPI. O banco de destino é PostgreSQL.

## 1. O que já está decidido (não precisa inventar)

| O quê | Onde está |
|---|---|
| Banco: **PostgreSQL**, hospedado no **Neon** | `README.md` da raiz |
| Entidades e relacionamentos | `02_Modelagem_e_Diagramas/diagrama-de-classes-cti-insights.png` |
| Ajustes que o grupo já aprovou no diagrama | `frontend-vue/API-CONTRATO.md`, seção "Decisões do grupo" |
| Colunas da planilha e regras de cada uma | `frontend-vue/README.md`, seção "Formato esperado da planilha" |
| Dados que o sistema mostra (o que o banco precisa devolver) | `frontend-vue/API-CONTRATO.md` (`GET /clientes`, `GET /uploads`, usuários) |
| Variáveis de conexão que o Java vai usar | `backend-java/.env.example` (`DB_URL`, `DB_USER`, `DB_PASSWORD`) |

O Vue **nunca** acessa o banco. O caminho é Vue → Spring Boot (Java) → PostgreSQL.
O Ricardo (Java) é quem vai conectar no banco, então combine os nomes das
tabelas com ele.

## 2. Aplicar o esquema

Use um banco vazio para aplicar a versão inicial. Em bancos já provisionados,
confira a versão do esquema e coordene a migração com o responsável.

```bash
createdb cti_insights
psql -v ON_ERROR_STOP=1 -d cti_insights -f database/schema.sql
```

A aplicação é transacional. Registre a versão aplicada pelo commit ou pela
tag da entrega. Evoluções devem ter scripts incrementais versionados.

**Migrações** (pasta [`migracoes/`](migracoes/)). Bancos criados antes de cada
versão precisam rodar o script dela. Bancos novos já recebem tudo pelo
`schema.sql`.

| Versão | Script | O que muda |
|---|---|---|
| V2 | `V2__trocar_senha.sql` | Coluna `usuario.trocar_senha`, para a senha temporária gerada pelo administrador |

## 3. Integração

Aponte as configurações do Java e do Python para o mesmo banco e esquema.
O Spring usa JDBC e mantém a inicialização SQL
desligada. O FastAPI grava cada carteira em uma transação. Consulte o
[guia de execução](../backend-java/README.md).

## 4. Tabelas

### 4.1 Lista

Nomes no banco em `snake_case` (o padrão do PostgreSQL). O Spring Boot converte
sozinho para `camelCase` no Java (`data_inicio` ↔ `dataInicio`).

| Tabela | Vem de | Campos |
|---|---|---|
| `usuario` | **Novo** (login e papéis; falta no diagrama) | id, nome, email (único), senha_hash, papel, papel_solicitado, status, criado_em, avaliado_em, avaliado_por_id |
| `consultor` | Diagrama | id, nome (único), email |
| `cliente` | Diagrama + ajustes 1 e 2 + **telemetria_id** | id, **telemetria_id**, codigo (único dentro do envio), **nome**, segmento, nivel, **faturamento_anual**, faixa_faturamento_anual, cidade, uf, consultor_id |
| `contrato` | Diagrama | id, cliente_id, data_inicio, data_fim, status, valor (só `cliente_id` e `data_inicio` são obrigatórios) |
| `servico` | Diagrama | id, nome (único), descricao, categoria |
| `contrato_servico` | Ligação N—N entre Contrato e Serviço | contrato_id, servico_id |
| `telemetria` | Diagrama + ajustes 3 e 4 (cada envio de planilha) | id, tipo_operacao, data_hora, status, mensagem, nome_arquivo, **linhas_lidas**, usuario_id |
| `insight` | Diagrama + **telemetria_id** | id, cliente_id, **telemetria_id**, titulo, descricao, data_geracao, tipo, prioridade (só `telemetria_id`, `descricao` e `data_geracao` são obrigatórios) |
| `estatistica` | **Novo** (resultado do ETL em Python; falta no diagrama) | id, telemetria_id (único), gerado_em, resultado |

Como os dados entram:

- **Cada planilha enviada é a carteira completa naquele momento.** Cada envio
  gera um registro em `telemetria`, e os clientes daquele envio ficam ligados a
  ele (`cliente.telemetria_id`). O sistema mostra o envio mais recente com
  status `NORMALIZADO`; os anteriores ficam guardados como histórico.
- **`telemetria`** é o registro de cada envio de planilha: quem enviou, quando,
  quantas linhas e o status.
- **`estatistica`** guarda, para cada envio, o resultado calculado pelo Python
  (média, mediana, desvio padrão e os dados dos gráficos) na coluna `resultado`,
  do tipo `JSONB`.
- **`insight`** guarda as frases geradas pelo Python, uma linha por frase,
  ligadas ao envio (`telemetria_id`). Frase geral fica com `cliente_id` vazio.
- **O sistema não trata clientes ativos ou inativos.** O foco é faturamento,
  serviços contratados e tipo de cliente, para encontrar oportunidades de
  upsell. `contrato.status` e `contrato.data_fim` existem porque estão no
  diagrama, mas ficam opcionais e sem regra.

Pontos de atenção:

- **N—N vira tabela de ligação.** Um contrato tem vários serviços e um serviço
  aparece em vários contratos, então é preciso a tabela `contrato_servico`.
- **Ordem de criação.** Uma tabela só pode apontar (`REFERENCES`) para outra que
  já existe. Crie nesta ordem: `usuario`, `consultor`, `servico`, `telemetria`,
  `cliente`, `contrato`, `contrato_servico`, `insight`, `estatistica`.
- **Dinheiro é `NUMERIC(15,2)`**, nunca `REAL` ou `FLOAT`, que arredondam.
- **Senha nunca em texto.** A coluna guarda o hash (BCrypt), gerado pelo Java.
- **Valores fixos com `CHECK`**, para o banco recusar valor errado:
  - `nivel`: `A`, `B`, `C`
  - `telemetria.status`: `PROCESSANDO`, `NORMALIZADO`, `ERRO_SCHEMA`
    (planilha recusada) e `ERRO_ETL` (planilha aceita, mas o Python falhou)
  - `usuario.papel`: `CONSULTOR`, `GESTOR`, `ADMINISTRADOR`
  - `usuario.status`: `PENDENTE`, `APROVADO`, `REJEITADO`
- **O mesmo código pode aparecer em envios diferentes** (é o mesmo cliente em
  planilhas de datas diferentes), mas não duas vezes no mesmo envio:
  `UNIQUE (telemetria_id, codigo)`.

### 4.2 Exemplo para começar

Duas tabelas prontas, para servir de modelo. As outras seguem o mesmo jeito
(`cliente` aponta para `telemetria`, que precisa ser criada antes).

```sql
CREATE TABLE consultor (
    id    BIGSERIAL PRIMARY KEY,
    nome  VARCHAR(150) NOT NULL UNIQUE,
    email VARCHAR(150) UNIQUE
);

CREATE TABLE cliente (
    id                       BIGSERIAL PRIMARY KEY,
    telemetria_id            BIGINT NOT NULL REFERENCES telemetria (id),
    codigo                   VARCHAR(50)  NOT NULL,
    nome                     VARCHAR(200) NOT NULL,
    segmento                 VARCHAR(80)  NOT NULL,
    nivel                    CHAR(1)      NOT NULL CHECK (nivel IN ('A', 'B', 'C')),
    faturamento_anual        NUMERIC(15,2) NOT NULL CHECK (faturamento_anual >= 0),
    faixa_faturamento_anual  VARCHAR(50),
    cidade                   VARCHAR(100),
    uf                       CHAR(2),
    consultor_id             BIGINT REFERENCES consultor (id),
    UNIQUE (telemetria_id, codigo)
);
```

`BIGSERIAL` é o `Long` do Java com numeração automática. `email` do consultor
fica sem `NOT NULL` porque a planilha só traz o nome dele. O nome do consultor é
único porque a planilha identifica o consultor pelo nome.
`faixa_faturamento_anual` fica opcional: está no diagrama (pedido do professor),
mas a planilha não traz esse dado.

### 4.3 Consulta que o sistema vai precisar

A tela de Relatórios recebe **uma linha por cliente** do envio mais recente,
com consultor, contrato e serviços juntos (`GET /clientes` no
`API-CONTRATO.md`). Quando as tabelas estiverem prontas, esta consulta deve
funcionar:

```sql
SELECT c.codigo, c.nome, c.segmento, c.nivel, c.faturamento_anual,
       co.nome AS consultor,
       ct.data_inicio,
       STRING_AGG(s.nome, ', ' ORDER BY s.nome) AS servicos
FROM cliente c
LEFT JOIN consultor co        ON co.id = c.consultor_id
LEFT JOIN contrato ct         ON ct.cliente_id = c.id
LEFT JOIN contrato_servico cs ON cs.contrato_id = ct.id
LEFT JOIN servico s           ON s.id = cs.servico_id
WHERE c.telemetria_id = (SELECT MAX(id) FROM telemetria WHERE status = 'NORMALIZADO')
GROUP BY c.id, co.nome, ct.id
ORDER BY c.nome;
```

## 5. Decisões

Já decididas pelo grupo:

| # | Decisão |
|---|---|
| 1 | **Quem cria as tabelas é o `schema.sql`.** O Java usa JDBC com `spring.sql.init.mode=never`. |
| 2 | **Login usa a tabela `usuario`**, separada de `consultor`: nem todo usuário é consultor (Gestor e Administrador também entram). |
| 3 | **Um contrato por cliente.** A tabela `contrato` existe (o diagrama permite vários), mas a planilha traz um por cliente. |
| 4 | **Frases do ETL na tabela `insight`**, uma por linha; números e gráficos em `estatistica.resultado` (`JSONB`). |
| 5 | **Status `ERRO_ETL`** quando a planilha foi aceita, mas o Python falhou. |
| 6 | **`faixa_faturamento_anual` fica**, opcional, porque o professor pediu. |
| 7 | **`usuario` e `estatistica` precisam entrar no diagrama de classes.** |
| 8 | **Cada planilha enviada é a carteira completa.** Os clientes ficam ligados ao envio (`telemetria_id`) e o sistema mostra o envio mais recente. |
| 9 | **Sem clientes ativos ou inativos** (orientação da professora). O foco é faturamento, serviços, tipo de cliente e upsell. |
| 10 | **`insight.titulo` é opcional**, porque as frases geradas pelo Python não têm título. |

Ainda em aberto (não impedem de começar):

| # | Pergunta | Sugestão |
|---|---|---|
| A | `Contrato.valor` é o faturamento do cliente ou o valor do contrato? | Deixar opcional (pode ficar vazio) até o grupo decidir. |
| B | O código do cliente segue um formato fixo (ex.: `CTI001`)? | Hoje aceita qualquer texto (o modelo usa `CLI-001`). Confirmar com o professor antes de pôr regra. |

## 6. Neon (banco do grupo)

O banco do grupo já foi criado no Neon pelo Ryan (projeto com o banco
`neondb`, usuário `neondb_owner`). Para usar esse banco no lugar do PostgreSQL
local:

1. Peça ao Ryan os dados de conexão **por mensagem privada**. No painel do
   Neon, eles ficam em **Connect** (host terminando com `.neon.tech`, banco,
   usuário e senha).
2. Se o esquema ainda não estiver aplicado no Neon, rode o `schema.sql` uma
   única vez:

   ```bash
   psql "postgresql://neondb_owner:SENHA@HOST/neondb?sslmode=require" -v ON_ERROR_STOP=1 -f database/schema.sql
   ```

3. No `backend-java/.env` (Java), use a URL JDBC **sem usuário e senha** e
   informe os dois separados:

   ```properties
   DB_URL=jdbc:postgresql://HOST/neondb?sslmode=require&channel_binding=require
   DB_USER=neondb_owner
   DB_PASSWORD=senha-do-neon
   ```

4. No `analytics-python/.env` (Python), preencha `DB_HOST`, `DB_NAME=neondb`,
   `DB_USER`, `DB_PASSWORD` e `DB_SSLMODE=require`. Confira com
   `python testar_conexao.py`.

**Nunca** coloque a senha no `application.properties`, no `schema.sql`, no
README ou num commit: o repositório é público. Os arquivos `.env` não vão para
o Git. Se uma senha for enviada por engano, troque-a no painel do Neon
(**Roles → Reset password**) antes de qualquer outra coisa.
