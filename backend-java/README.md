# Backend Java do CTI Insights

Spring Boot 4.1.1, JDK 21, Spring Security, Validation, Jackson e JDBC.
O Vue envia JSON ao Spring. O FastAPI calcula e persiste a carteira. O
Spring consulta as tabelas compartilhadas no PostgreSQL.

## Executar localmente

1. Em um PostgreSQL de desenvolvimento, crie um banco e aplique o esquema
   inicial uma vez a partir da raiz do repositório.

   ```bash
   createdb cti_insights
   psql -v ON_ERROR_STOP=1 -d cti_insights -f database/schema.sql
   ```

2. Configure o banco e `ETL_API_KEY` em `analytics-python/.env`, conforme
   o exemplo da pasta. Instale `requirements.txt` em um ambiente virtual
   e inicie o serviço com `python -m uvicorn api:app --port 8000`.
3. Copie `backend-java/.env.example` para `backend-java/.env`. Configure
   `DB_URL` no formato JDBC, `DB_USER` e `DB_PASSWORD` para o mesmo banco e
   esquema usados pelo Python. Use `ETL_URL` como URL base do FastAPI e a
   mesma `ETL_API_KEY` nos dois serviços. O FastAPI responde `503` quando a chave não foi configurada e `401` quando a chave enviada está ausente ou incorreta. Os padrões de conexão e leitura
   são 3 s e 60 s, configuráveis com `ETL_CONNECT_TIMEOUT` e `ETL_READ_TIMEOUT`.
4. Para o primeiro administrador, configure `ADMIN_NAME`, `ADMIN_EMAIL` e
   `ADMIN_PASSWORD` antes de ligar o Spring. O bootstrap é transacional e
   executado apenas se ainda faltar um administrador aprovado. Use um
   e-mail reservado para isso e remova o segredo de bootstrap da configuração
   do serviço após criar a conta. O cadastro via API sempre inicia pendente.
5. Na pasta `backend-java`, execute `./mvnw spring-boot:run` no Linux ou
   `.\mvnw.cmd spring-boot:run` no PowerShell. Use `SESSION_COOKIE_SECURE=false`
   somente para desenvolvimento com HTTP local. Em ambiente com HTTPS,
   mantenha o padrão `true`.
6. No Vue, configure `VITE_USE_MOCK=false` e `VITE_API_URL=/api`.
   O proxy do Vite encaminha `/api` para o Spring em `localhost:8080`.
   Em ambiente compartilhado, sirva o Vue e encaminhe `/api` pela mesma
   origem HTTPS. Indique o endereço privado do FastAPI em `ETL_URL`.

Variáveis exportadas têm preferência sobre o arquivo `.env` do Java. Use
`sslmode=require` nas conexões do Neon e combine com Ryan a aplicação do
DDL. O Spring está configurado para iniciar sem criar tabelas. Migre em
conjunto as versões de Java e Python deste PR. Sessões são mantidas no
processo Spring e expiram após 30 minutos de inatividade.

## Rotas e contratos

Todas as rotas abaixo têm prefixo `/api`. Para métodos de escrita,
consulte `GET /auth/csrf` e envie o cabeçalho indicado por `headerName` com
o valor `token`. Preserve o cookie de sessão entre as chamadas e obtenha
outro token após o login, que inicia uma nova sessão.

| Método e rota | Acesso | Resultado |
|---|---|---|
| GET `/health` | Público | `200` com `{"status":"ok"}`, verifica o processo Spring |
| GET `/auth/csrf` | Público | Token vinculado à sessão |
| POST `/auth/cadastro` | Público | `201`, cadastro pendente |
| POST `/auth/login` | Público | `200`, cookie e `{email,nome,papel}`; `401` para credenciais inválidas e `403` com código para cadastro pendente ou rejeitado |
| POST `/auth/logout` | Autenticado | `204`, encerra a sessão |
| GET `/usuarios` e PATCH `/usuarios/{id}` | Administrador | Lista e aprova ou rejeita, com dados da avaliação |
| GET e POST `/uploads` | Consultor e Administrador | Histórico e importação |
| GET `/clientes`, GET `/clientes/{id}`, GET `/dashboard` | Autenticado | Carteira e resultados da última telemetria normalizada |
| POST `/clientes`, PUT `/clientes/{id}` | Consultor e Administrador | Cria ou substitui um cliente na carteira e recalcula os resultados |
| DELETE `/clientes/{id}` | Administrador | Exclui um cliente da carteira atual e recalcula os resultados |

Exemplo de corpo para `POST /uploads`:

```json
{
  "nomeArquivo": "clientes.xlsx",
  "linhasLidas": 2,
  "linhas": [{
    "codigo_cliente": "CTI001",
    "nome_cliente": "Metalúrgica Horizonte",
    "consultor": "Ana Lima",
    "segmento": "Indústria",
    "nivel_cliente": "A",
    "faturamento_anual": 1850000,
    "data_contratacao": "2025-01-15",
    "servicos_contratados": "Internet Dedicada;Firewall",
    "cidade": "Campinas",
    "uf": "SP"
  }]
}
```

`linhasLidas` inclui as linhas que o Vue descartou. POST/PUT de cliente
recebem o mesmo objeto de uma linha. O identificador usado no CRUD é o
`id` de `GET /clientes` e pertence à revisão atual. Recarregue a lista
após uma alteração. Escritas de carteira concorrentes recebem `409`
enquanto outra escrita estiver em andamento.

O POST grava `PROCESSANDO` antes de chamar `POST /etl` com `X-ETL-Key`.
A resposta aguarda o ETL. Retorna `201` para upload ou inclusão, `200`
para edição ou exclusão, com o registro final da telemetria. Um lote JSON
inválido identificado na validação gera `ERRO_SCHEMA` e `400`. Falhas do
ETL geram `ERRO_ETL` e `502`. O histórico inclui `linhasImportadas` quando
a estatística do lote informa a contagem. O Python pode rejeitar segmentos
desconhecidos. Se rejeitar todas as linhas, a carteira anterior segue
visível.

O CRUD cria uma revisão completa a partir da carteira vigente. O FastAPI
recalcula estatísticas e insights para a nova revisão. As revisões anteriores
continuam no banco. O Dashboard usa os indicadores do ETL para a carteira
completa e os filtros existentes do Vue para recortes de clientes. Upsell e
insights do modo API vêm do ETL.

Veja também o [contrato do Vue](../frontend-vue/API-CONTRATO.md) e o
[modelo do banco](../database/README.md).

## Verificação

Execute `./mvnw test` ou `.\mvnw.cmd test`. Para rodar os testes HTTP e
JDBC com um PostgreSQL de teste, configure:

```text
TEST_DB_URL=jdbc:postgresql://localhost:5432/cti_insights_test
TEST_DB_USER=<usuário de teste com permissão para criar um esquema>
TEST_DB_PASSWORD=<senha do usuário de teste>
```

Os testes HTTP criam e removem um esquema isolado e simulam somente o serviço
FastAPI. Sem `TEST_DB_URL`, rodam os testes unitários. O teste com FastAPI
real pode usar o JSON acima e as rotas de consulta, seguido de uma nova
importação com código duplicado ou segmento desconhecido para verificar
a preservação da carteira.

Na validação desta entrega, o Maven executou cinco testes com PostgreSQL 17.
Também passaram `npm run lint`, `npm run build` e o teste de ponta a ponta
com Spring, FastAPI e PostgreSQL 17 locais. O fluxo real verificou a
normalização de dois clientes, a leitura de estatísticas e insights, a
preservação da carteira após rejeição e o CRUD até uma carteira vazia,
mantendo os dois clientes do lote original no banco. No Chromium, o modo
API do Vue passou por login, importação de CSV, exibição de insight do
FastAPI no Dashboard e consulta do cliente em Relatórios.

No Windows, a integração recuperada foi revalidada com cinco testes Maven
em PostgreSQL 17, lint, build do Vue e auditoria npm com zero alertas após
atualizar o lockfile. Um smoke test HTTP pelo proxy do Vite confirmou login
com sessão e CSRF, rejeição de requisição ao ETL sem chave, upload,
clientes, dashboard, preservação da carteira após erros e edição e
exclusão com histórico preservado. O teste usou Spring, FastAPI e
PostgreSQL 17 locais.
