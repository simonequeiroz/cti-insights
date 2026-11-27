# Decisões técnicas e requisitos do back-end

Optamos por HTTP/REST em vez de `ProcessBuilder` para integrar Java e Python porque o ETL FastAPI executa como serviço independente, inclusive em outra máquina ou container, recebe JSON por um contrato explícito e permite autenticação por chave e limites de tempo de conexão e leitura. `ProcessBuilder` exigiria o interpretador, as bibliotecas e os scripts no ambiente do processo Java, além de gerenciar a entrada, saída e encerramento do subprocesso. Para persistência, escolhemos JDBC com `JdbcClient` em vez de JPA porque o esquema PostgreSQL é compartilhado com o ETL e a aplicação utiliza SQL explícito, junções, agregações, JSONB, arrays e bloqueios transacionais específicos do PostgreSQL. JDBC mantém controle direto dessas consultas e dos limites das transações sem acrescentar o mapeamento ORM; JPA seria uma alternativa válida para operações centradas em entidades, mas não é necessário para o fluxo atual.

## Exceções e contrato HTTP

- `ExcelInvalidoException`: 400, `EXCEL_INVALIDO`, conteúdo de importação inválido (a leitura binária do Excel permanece no frontend).
- `ColunaObrigatoriaException`: 400, `COLUNA_OBRIGATORIA`, campos obrigatórios ausentes no JSON recebido.
- `ClienteDuplicadoException`: 400 para duplicidade na importação, 409 para conflito com a carteira atual; `CLIENTE_DUPLICADO` em ambos.
- `ErrosApi` é o `@RestControllerAdvice` global (especialização de `@ControllerAdvice`). Preserva `mensagem` e acrescenta `codigo`.

## CORS

Definir `CORS_ALLOWED_ORIGINS` no backend publicado para a origem HTTPS exata do frontend Vercel, sem caminho nem barra final. Lista separada por vírgulas; não usar `*`. O Spring Security trata o preflight OPTIONS para `/api/**`, preservando sessão e CSRF. Para chamadas diretas entre sites distintos, `SESSION_COOKIE_SAME_SITE=none` e `SESSION_COOKIE_SECURE=true`; bloqueios de cookies de terceiros podem exigir proxy `/api` na mesma origem do frontend. Validar em navegador real após o deploy. O endereço oficial será informado pelo responsável de nuvem; não presumir domínio.

## Modelo orientado a objetos

As seis classes `Cliente`, `Consultor`, `Servico`, `Contrato`, `Insight` e `Telemetria` herdam `Entidade`. Os campos são privados e finais, com getters e listas protegidas por `List.copyOf`. O cliente se relaciona com consultor e contrato, e o contrato agrega serviços. Cada classe sobrescreve `resumo()`; o serviço usa esse contrato polimórfico para produzir os nomes de serviços, consultor e descrições de insights. Os mapeadores JDBC instanciam os objetos e os convertem nos DTOs já usados pelo Vue. Não há mudança do esquema SQL nem do formato das respostas.

## Explicação para apresentação

O Controller recebe a requisição HTTP e delega ao Service; o Service valida e coordena o fluxo com JDBC/PostgreSQL e chama o ETL Python por HTTP. O SecurityFilterChain verifica sessão, CSRF e papel. Consultor e administrador podem inserir e editar clientes; só o administrador exclui; usuários aprovados consultam a carteira. Uma revisão normalizada substitui a carteira ativa e mantém as anteriores no histórico. O ETL escreve dados e estatísticas; o dashboard lê a revisão normalizada mais recente.

## Verificação

Executar `mvnw.cmd test` em `backend-java`. Sem `TEST_DB_URL`, a suíte HTTP com PostgreSQL será ignorada: não declarar integração aprovada. Para integração, usar banco PostgreSQL de teste, `TEST_DB_URL`, `TEST_DB_USER`, `TEST_DB_PASSWORD`; o teste cria um schema temporário. Não usar dados confidenciais ou banco de produção para testar. A configuração de CORS deve ser validada com o domínio real após a publicação.
