# Backend Java do CTI Insights

Spring Boot 4.1.1, Java 21, Spring Security, Validation, Jackson e JDBC. O Vue envia JSON ao Spring, o FastAPI processa a carteira e o Spring lê o resultado no PostgreSQL.

## Executar localmente

1. Crie um banco PostgreSQL de desenvolvimento e aplique o [esquema inicial](../database/schema.sql) a partir da raiz do projeto.

   ```bash
   createdb cti_insights
   psql -v ON_ERROR_STOP=1 -d cti_insights -f database/schema.sql
   ```

2. Copie os arquivos `.env.example` para `.env` nas pastas [Java](.env.example) e [Python](../analytics-python/.env.example). Use o mesmo banco, esquema e `ETL_API_KEY` nos dois serviços. Para criar o primeiro administrador, configure `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` no Java. Remova a senha de bootstrap da configuração após a criação da conta.
3. Na pasta `analytics-python`, instale as dependências e inicie o ETL.

   ```bash
   python -m pip install -r requirements.txt
   python -m uvicorn api:app --port 8000
   ```

4. Na pasta `backend-java`, execute `./mvnw spring-boot:run` ou `.\mvnw.cmd spring-boot:run` no Windows. Para HTTP local, configure `SESSION_COOKIE_SECURE=false`. Mantenha o padrão `true` sob HTTPS.
5. Configure o Vue com `VITE_USE_MOCK=false` e `VITE_API_URL=/api`. O proxy do Vite encaminha as chamadas ao Spring na porta 8080. Em ambiente compartilhado, Vue e API devem usar a mesma origem HTTPS, com o FastAPI em endereço privado. No Neon, use `sslmode=require`.

O Spring usa `DB_URL` no formato JDBC e as variáveis `DB_USER` e `DB_PASSWORD`. Para o ETL, use `ETL_URL` e, se necessário, ajuste `ETL_CONNECT_TIMEOUT` (padrão de 3 s) e `ETL_READ_TIMEOUT` (60 s). A configuração do Java também aceita variáveis de ambiente exportadas.

## Rotas

Todas as rotas abaixo usam o prefixo `/api`. Antes de uma escrita, obtenha o token em `GET /auth/csrf` e envie o cabeçalho informado em `headerName`. Preserve o cookie da sessão e obtenha um novo token depois do login.

| Rotas | Permissão e resultado |
|---|---|
| `GET /health`, `GET /auth/csrf` | Públicas. Saúde do processo e token CSRF. |
| `POST /auth/cadastro`, `POST /auth/login` | Públicas. Cadastro pendente ou login de conta aprovada. |
| `POST /auth/logout` | Autenticado. Encerra a sessão. |
| `GET /usuarios`, `PATCH /usuarios/{id}` | Administrador. Lista usuários, aprova, recusa, bloqueia, reativa e troca o papel. Vale na hora, mesmo para quem está logado, porque a sessão é conferida a cada requisição. |
| `POST /usuarios/{id}/senha-temporaria` | Administrador. Gera uma senha temporária (devolvida uma única vez). No próximo login, a resposta traz `trocarSenha: true`. |
| `POST /auth/senha` | Autenticado. Troca a própria senha: `{ senhaAtual, novaSenha }` → `204`. |
| `GET /uploads`, `POST /uploads` | Consultor ou administrador. Histórico e envio de carteira. |
| `GET /clientes`, `GET /clientes/{id}`, `GET /dashboard` | Autenticado. Dados do último envio normalizado. |
| `POST /clientes`, `PUT /clientes/{id}` | Consultor ou administrador. Inclusão e edição. |
| `DELETE /clientes/{id}` | Administrador. Exclusão na carteira atual. |

O upload grava `PROCESSANDO` antes da chamada ao FastAPI e aguarda o resultado. O envio normalizado retorna `201`. Falhas de validação do lote retornam `400`, e falhas do ETL retornam `502`. O FastAPI exige a chave compartilhada em `X-ETL-Key`.

Uma alteração manual gera uma nova revisão. Recarregue a lista de clientes depois de escrever, pois o ID pertence à revisão atual. Escritas concorrentes podem receber `409` e ser tentadas novamente após o processamento. Os exemplos JSON e os formatos estão no [contrato da API](../frontend-vue/API-CONTRATO.md).

## Testar

Rode `./mvnw test` ou `.\mvnw.cmd test`. Para incluir a suíte HTTP com ETL simulado, configure `TEST_DB_URL`, `TEST_DB_USER` e `TEST_DB_PASSWORD` para um PostgreSQL de teste. O usuário precisa poder criar esquemas. A suíte cria e remove um esquema isolado.

> **No Neon, use o endereço direto (sem `-pooler`) no `TEST_DB_URL`.** O pooler
> não mantém o esquema escolhido entre transações: os testes falham com
> `EmptyResultDataAccessException` e podem gravar dados de teste nas tabelas
> reais (`public`). Exemplo: `jdbc:postgresql://ep-xxxx.REGIAO.aws.neon.tech/neondb?sslmode=require`.
> A aplicação em si pode continuar usando o endereço com `-pooler`.

Na validação anterior do PR, também foram executados o fluxo real com Spring, FastAPI e PostgreSQL 17 e o fluxo do Vue em Chromium. Consulte o [guia de estudo](GUIA-DE-ESTUDO.md) para acompanhar o caminho dos dados e preparar a apresentação.
