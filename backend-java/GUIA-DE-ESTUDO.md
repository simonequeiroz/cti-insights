# Guia de estudo do backend CTI Insights

## O que o sistema resolve

O CTI recebe uma planilha com a carteira comercial, padroniza os clientes e gera indicadores e oportunidades de venda de serviços. Cada importação representa uma carteira completa. O painel usa a carteira do envio normalizado mais recente e o banco mantém as versões anteriores.

## Como explicar as classes

| Componente | Responsabilidade |
|---|---|
| `CtiInsightsApplication` | Inicia o Spring Boot e carrega os componentes do projeto. |
| `UsuarioController` | Recebe as requisições de cadastro, login, logout e administração de contas. Também expõe saúde e token CSRF. |
| `UsuarioService` | Valida cadastro e credenciais, usa BCrypt, consulta os papéis no banco e registra a avaliação. A inicialização do administrador usa a configuração do ambiente. |
| `SecurityConfig` | Aplica a permissão de cada rota. Recupera o usuário pela sessão e consulta o papel aprovado no banco em cada requisição autenticada. |
| `CarteiraController` | Expõe upload, histórico, clientes, dashboard e CRUD. Define a resposta HTTP do processamento. |
| `ValidadorImportacao` | Valida os campos e os códigos duplicados e normaliza data e faturamento. Usa registros Java para distinguir a entrada JSON da linha validada que segue para o ETL. |
| `CarteiraService` | Coordena importações e alterações, consulta clientes e dashboard via JDBC e mantém as alterações na carteira em sequência. |
| `TelemetriaRepository` | Registra o envio em uma transação própria para que o FastAPI consiga encontrá-lo ao abrir sua conexão com o PostgreSQL. |
| `ClienteEtl` | Chama `POST /etl` com o ID do envio, a quantidade recebida e as linhas. Configura URL, chave e timeouts. |
| `ErrosApi` | Converte erros de entrada e conflitos de integridade em respostas HTTP com uma mensagem consistente. |

Para explicar a arquitetura, acompanhe uma rota do controller até o service. O controller trata HTTP, o service aplica as regras e o JDBC consulta ou grava o banco. Os DTOs definem quais dados atravessam cada fronteira.

## Acompanhe uma importação

1. O consultor entra no Vue. O Spring verifica a senha com BCrypt, troca a sessão no login e aplica as permissões no servidor. A sessão fica em cookie e as operações de escrita exigem CSRF.
2. O Vue lê o arquivo e apresenta os erros encontrados. Ao confirmar, envia o nome do arquivo, a contagem total e as linhas válidas em JSON para `POST /api/uploads`.
3. O Spring valida de novo. Um código duplicado, por exemplo, gera erro de validação. Uma importação válida cria telemetria `PROCESSANDO`.
4. O Spring chama o FastAPI com a chave compartilhada. O módulo `limpeza.py` padroniza os dados. `analise.py` calcula indicadores e aciona a geração de insights e upsell.
5. `banco.py` grava no PostgreSQL em uma transação. A carteira é ligada à telemetria. Cada cliente tem um contrato e contratos podem compartilhar serviços. A mesma transação grava estatísticas, insights e o status `NORMALIZADO`.
6. O Vue consulta `/api/clientes` e `/api/dashboard`. O Spring busca a última telemetria `NORMALIZADO` e devolve a carteira, o JSON de estatísticas e as frases da tabela `insight`.
7. Se o envio falhar, o histórico mostra o erro. As consultas continuam usando o último envio normalizado.

## Por que o CRUD cria revisões

Na inclusão, edição ou exclusão, o Java prepara uma cópia da carteira vigente com a mudança e chama o ETL para recalcular o dashboard. O histórico permanece consultável no banco. A exclusão do último cliente gera uma carteira vazia normalizada. O bloqueio no PostgreSQL evita que duas alterações concorrentes partam da mesma carteira.

## Roteiro para demonstrar

1. Mostre a diferença entre o login de um administrador e o de um gestor. Explique que o gestor pode consultar a carteira e que o Spring aplica essa permissão mesmo quando alguém chama a API diretamente.
2. Importe uma planilha pequena e localize o envio em `GET /api/uploads`.
3. Abra o Dashboard e os Relatórios. Relacione um cliente, um indicador e um insight com suas tabelas de origem.
4. Mostre um teste que provoca falha e verifica que o dashboard continua ligado ao envio anterior. Use `ApiIntegrationTests` para explicar o teste com PostgreSQL e ETL simulado. Use `ValidadorImportacaoTests` para explicar as regras de entrada.

## Perguntas para ensaiar

- **Por que validar no Java se o Vue valida?** A API pode receber requisições de qualquer cliente. O Java garante a regra independentemente da tela.
- **Por que manter dois serviços?** O Spring organiza a API comercial e a segurança. O Python concentra o tratamento de dados e os cálculos.
- **Por que JDBC?** Java e Python já compartilham um esquema relacional. As consultas SQL deixam explícitas as ligações entre as tabelas.
- **Por que telemetria em transação própria?** A chamada acontece entre processos. O FastAPI precisa enxergar a linha confirmada no banco antes de processá-la.
- **O que o projeto dispensa?** Fila de processamento, camada de mapeamento genérica e adoção de JPA apenas para envolver as consultas JDBC. A rota Python `/testar` é um apoio ao desenvolvimento e fica fora do fluxo normal do Vue.
