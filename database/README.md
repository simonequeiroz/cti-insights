# Banco de dados — como começar

Guia para quem vai montar o banco do CTI Insights (PostgreSQL). Hoje a pasta
`database/` só tem o `schema.sql`, que está **vazio**. Nenhuma tabela foi criada
ainda, nem localmente nem no Neon.

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

## 2. O que falta

1. **Escrever o `schema.sql`**: as tabelas, as chaves e as regras (seção 4).
2. **Criar um `seed.sql`**: alguns dados de teste para o Java e o front usarem.
3. **Criar o banco no Neon** e passar a conexão ao Ricardo e ao Miguel (seção 6).

O desenho das tabelas já foi decidido (seção 4). Restam só dois detalhes, que
não impedem de começar (seção 5).

## 3. Primeiros passos (na sua máquina)

1. **Instale o PostgreSQL** (versão 16 ou 17) pelo instalador oficial:
   <https://www.postgresql.org/download/windows/>. Anote a senha do usuário
   `postgres` que o instalador pede. O instalador já traz o **pgAdmin**, que
   é a tela para ver as tabelas. O DBeaver também serve.
2. **Crie o banco** no pgAdmin (botão direito em *Databases* → *Create*) com o
   nome `cti_insights`, ou pelo terminal:

   ```bash
   psql -U postgres -c "CREATE DATABASE cti_insights;"
   ```

3. **Crie uma branch** a partir da `main` atualizada:

   ```bash
   git checkout main
   git pull
   git checkout -b feature/database-schema
   ```

4. **Escreva o `schema.sql`** começando pela seção 4. Rode e repita até não
   dar erro:

   ```bash
   psql -U postgres -d cti_insights -f database/schema.sql
   ```

   Dica: comece o arquivo com `DROP TABLE IF EXISTS ... CASCADE;` para poder
   rodar de novo do zero quantas vezes quiser.
5. **Escreva o `seed.sql`** com uns 5 clientes, 2 consultores, 3 serviços e
   1 usuário, e rode da mesma forma.
6. **Teste a consulta principal** (seção 4.3). Se ela devolver os clientes
   certinhos, o banco atende a tela de Dashboard.
7. **Abra um PR** para a `main` com `schema.sql`, `seed.sql` e um print do
   pgAdmin com as tabelas, para a pasta `evidencias/`.

## 4. Tabelas

### 4.1 Lista

Nomes no banco em `snake_case` (o padrão do PostgreSQL). O Spring Boot converte
sozinho para `camelCase` no Java (`data_inicio` ↔ `dataInicio`).

| Tabela | Vem de | Campos |
|---|---|---|
| `usuario` | **Novo** (login e papéis; falta no diagrama) | id, nome, email (único), senha_hash, papel, papel_solicitado, status, criado_em, avaliado_em, avaliado_por_id |
| `consultor` | Diagrama | id, nome (único), email |
| `cliente` | Diagrama + ajustes 1 e 2 | id, codigo (único), **nome**, segmento, nivel, **faturamento_anual**, faixa_faturamento_anual, cidade, uf, consultor_id, saiu_da_planilha_em |
| `contrato` | Diagrama | id, cliente_id, data_inicio, data_fim, status, valor |
| `servico` | Diagrama | id, nome (único), descricao, categoria |
| `contrato_servico` | Ligação N—N entre Contrato e Serviço | contrato_id, servico_id |
| `telemetria` | Diagrama + ajustes 3 e 4 (cada envio de planilha) | id, tipo_operacao, data_hora, status, mensagem, nome_arquivo, **linhas_lidas**, usuario_id |
| `insight` | Diagrama + **telemetria_id** | id, cliente_id, **telemetria_id**, titulo, descricao, data_geracao, tipo, prioridade |
| `estatistica` | **Novo** (resultado do ETL em Python; falta no diagrama) | id, telemetria_id (único), gerado_em, resultado |

Como os dados entram:

- **Base única de clientes.** Cada importação atualiza o cliente pelo `codigo`
  (não cria outro). Quem não vem na planilha fica inativo e
  `saiu_da_planilha_em` guarda a data; volta a ativo se aparecer de novo.
- **`telemetria`** é o registro de cada envio de planilha: quem enviou, quando,
  quantas linhas e o status.
- **`estatistica`** guarda, para cada envio, o resultado calculado pelo Python
  (média, mediana, desvio padrão e os dados dos gráficos) na coluna `resultado`,
  do tipo `JSONB`.
- **`insight`** guarda as frases geradas pelo Python, uma linha por frase,
  ligadas ao envio (`telemetria_id`). Frase geral fica com `cliente_id` vazio.

Pontos de atenção:

- **N—N vira tabela de ligação.** Um contrato tem vários serviços e um serviço
  aparece em vários contratos, então é preciso a tabela `contrato_servico`.
- **Ordem de criação.** Uma tabela só pode apontar (`REFERENCES`) para outra que
  já existe. Crie nesta ordem: `usuario`, `consultor`, `servico`, `cliente`,
  `contrato`, `contrato_servico`, `telemetria`, `insight`, `estatistica`.
- **Dinheiro é `NUMERIC(15,2)`**, nunca `REAL` ou `FLOAT`, que arredondam.
- **Senha nunca em texto.** A coluna guarda o hash (BCrypt), gerado pelo Java.
- **Valores fixos com `CHECK`**, para o banco recusar valor errado:
  - `nivel`: `A`, `B`, `C`
  - `contrato.status`: `Ativo`, `Inativo`
  - `telemetria.status`: `PROCESSANDO`, `NORMALIZADO`, `ERRO_SCHEMA`
    (planilha recusada) e `ERRO_ETL` (planilha aceita, mas o Python falhou)
  - `usuario.papel`: `CONSULTOR`, `GESTOR`, `ADMINISTRADOR`
  - `usuario.status`: `PENDENTE`, `APROVADO`, `REJEITADO`
- **Cliente que sai da planilha não é apagado**: fica inativo e
  `saiu_da_planilha_em` guarda a data. Por isso não use `ON DELETE CASCADE` em
  `cliente`.

### 4.2 Exemplo para começar

Duas tabelas prontas, para servir de modelo. As outras seguem o mesmo jeito.

```sql
CREATE TABLE consultor (
    id    BIGSERIAL PRIMARY KEY,
    nome  VARCHAR(150) NOT NULL UNIQUE,
    email VARCHAR(150) UNIQUE
);

CREATE TABLE cliente (
    id                       BIGSERIAL PRIMARY KEY,
    codigo                   VARCHAR(50)  NOT NULL UNIQUE,
    nome                     VARCHAR(200) NOT NULL,
    segmento                 VARCHAR(80)  NOT NULL,
    nivel                    CHAR(1)      NOT NULL CHECK (nivel IN ('A', 'B', 'C')),
    faturamento_anual        NUMERIC(15,2) NOT NULL CHECK (faturamento_anual >= 0),
    faixa_faturamento_anual  VARCHAR(50),
    cidade                   VARCHAR(100),
    uf                       CHAR(2),
    consultor_id             BIGINT REFERENCES consultor (id),
    saiu_da_planilha_em      DATE
);
```

`BIGSERIAL` é o `Long` do Java com numeração automática. `email` do consultor
fica sem `NOT NULL` porque a planilha só traz o nome dele. O nome do consultor é
único porque a planilha identifica o consultor pelo nome.
`faixa_faturamento_anual` fica opcional: está no diagrama (pedido do professor),
mas a planilha não traz esse dado.

### 4.3 Consulta que o sistema vai precisar

A tela de Dashboard recebe **uma linha por cliente** com consultor, contrato e
serviços juntos (`GET /clientes` no `API-CONTRATO.md`). Quando as tabelas
estiverem prontas, esta consulta deve funcionar:

```sql
SELECT c.codigo, c.nome, c.segmento, c.nivel, c.faturamento_anual,
       co.nome AS consultor,
       ct.data_inicio, ct.status, ct.data_fim,
       STRING_AGG(s.nome, ', ' ORDER BY s.nome) AS servicos
FROM cliente c
LEFT JOIN consultor co        ON co.id = c.consultor_id
LEFT JOIN contrato ct         ON ct.cliente_id = c.id
LEFT JOIN contrato_servico cs ON cs.contrato_id = ct.id
LEFT JOIN servico s           ON s.id = cs.servico_id
GROUP BY c.id, co.nome, ct.id
ORDER BY c.nome;
```

## 5. Decisões

Já decididas pelo grupo:

| # | Decisão |
|---|---|
| 1 | **Quem cria as tabelas é o `schema.sql`.** No Java, `spring.jpa.hibernate.ddl-auto=validate`, que só confere se as tabelas batem e nunca cria nem altera. Combinar com o Ricardo. |
| 2 | **Login usa a tabela `usuario`**, separada de `consultor`: nem todo usuário é consultor (Gestor e Administrador também entram). |
| 3 | **Um contrato por cliente por enquanto.** A tabela `contrato` existe (o diagrama permite vários), mas a planilha traz um por cliente. |
| 4 | **Frases do ETL na tabela `insight`**, uma por linha; números e gráficos em `estatistica.resultado` (`JSONB`). |
| 5 | **Status `ERRO_ETL`** quando a planilha foi aceita, mas o Python falhou. |
| 6 | **`faixa_faturamento_anual` fica**, opcional, porque o professor pediu. |
| 7 | **`usuario` e `estatistica` precisam entrar no diagrama de classes.** |

Ainda em aberto (não impedem de começar):

| # | Pergunta | Sugestão |
|---|---|---|
| A | `Contrato.valor` é o faturamento do cliente ou o valor do contrato? | Deixar opcional (pode ficar vazio) até o grupo decidir. |
| B | O código do cliente segue um formato fixo (ex.: `CTI001`)? | Hoje aceita qualquer texto (o modelo usa `CLI-001`). Confirmar com o professor antes de pôr regra. |

## 6. Neon (depois que funcionar na sua máquina)

1. Crie uma conta em <https://neon.tech> (o plano gratuito basta) e um
   projeto. O Neon já cria um banco PostgreSQL chamado `neondb`.
2. No painel, clique em **Connect** e copie os dados de conexão: host
   (termina com `.neon.tech`), banco, usuário e senha. A conexão exige SSL
   (`sslmode=require`).
3. Rode o mesmo `schema.sql` e o `seed.sql` nele: pelo **SQL Editor** do
   próprio painel do Neon, ou pelo pgAdmin/DBeaver conectando com esses dados.
4. Passe ao Ricardo (Java) e ao Miguel (Python) os dados de conexão **por
   mensagem privada**. Eles vão no arquivo `.env` de cada um, que não vai para o
   Git. **Nunca** coloque senha no `schema.sql`, no README ou num commit.

## 7. Checklist

- [ ] PostgreSQL instalado e banco `cti_insights` criado
- [ ] Branch `feature/database-schema` criada
- [ ] `schema.sql` cria as 9 tabelas sem erro
- [ ] `seed.sql` com dados de teste
- [ ] Consulta da seção 4.3 devolve os clientes
- [ ] Decisão 1 da seção 5 combinada com o Ricardo
- [ ] PR aberto com print das tabelas
- [ ] Banco criado no Neon e conexão passada ao Ricardo e ao Miguel
