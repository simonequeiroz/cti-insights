# Fluxo do sistema — CTI Insights

Este documento define **como os dados percorrem o sistema** e **o que cada parte
faz**. Front, Java, Python e banco seguem este fluxo. Quando houver dúvida
sobre onde uma regra deve ficar, a resposta está aqui.

## 1. Para que serve o sistema

A CTI quer conhecer a sua carteira de clientes (**faturamento**, **serviços
contratados** e **tipo de cliente**, ou seja, segmento e nível) para encontrar
**oportunidades de upsell**: clientes que podem contratar mais serviços.

**Fora do escopo:** clientes ativos ou inativos, cancelamentos e churn. A
professora orientou que o projeto não trata isso.

## 2. O fluxo, passo a passo

```
 Planilha (.xlsx/.csv)
   │ 1. Consultor envia na tela Importar
   ▼
 Vue + Pinia ─────────── 2. lê, valida e mostra os erros; o usuário confirma
   │ 3. Axios: POST /api/uploads  (JSON só com as linhas válidas)
   ▼
 Spring Boot ─────────── 4. DTO + @Valid revalida; Service padroniza e confere duplicados
   │                      5. grava o envio na tabela telemetria (PROCESSANDO)
   │ 6. PythonEtlService: POST /etl  { telemetriaId, recebidas, linhas }
   ▼
 Python (FastAPI) ────── 7. limpa (pandas), calcula as estatísticas e o upsell,
   │                         escreve as frases e grava tudo no banco
   ▼
 PostgreSQL (Neon) ───── cliente, consultor, servico, contrato, estatistica, insight
   ▲
   │ 8. GET /api/dashboard  (Spring lê o que o Python gravou)
 Vue ─────────────────── 9. Dashboard e Relatórios só desenham os números e frases
```

## 3. O que cada parte faz (e o que não faz)

| Parte | Faz | **Não** faz |
|---|---|---|
| **Vue + Pinia** (front) | Lê a planilha, valida cada linha, mostra os erros antes de enviar, envia as linhas válidas, desenha gráficos e tabelas com o que o back-end devolve, controla o que cada papel vê | Não calcula estatísticas nem upsell; não grava dados; não acessa o banco |
| **Spring Boot** (Java) | Login e papéis, revalida os dados (DTO + Service), grava cada envio, chama o Python, entrega os dados ao front (`/api/...`), aplica as permissões de cada papel em cada rota | Não calcula estatísticas; não confia só na validação do front |
| **Python** (pandas + FastAPI) | Padroniza (ex.: `IND.` → `Indústria`), calcula média, mediana, desvio, agrupamentos e **oportunidades de upsell**, escreve as frases e grava o resultado | Não lê a planilha; não valida campo a campo de novo; não fala com o front |
| **PostgreSQL** (Neon) | Guarda os dados tratados, o histórico de envios e os resultados | Não tem regra de negócio, só as regras de integridade (`CHECK`, chaves) |

**Validação em três níveis**, como ensinado nas aulas:
1. **Pinia:** avisa o usuário na hora e não deixa enviar linha com erro.
2. **Spring:** valida de novo, porque nunca se confia só no navegador.
3. **Python:** só padroniza o texto. A proteção que ele tem é extra.

## 4. Os acordos entre as partes

| De → Para | Rota | O que vai | O que volta |
|---|---|---|---|
| Front → Spring | `POST /api/auth/login` | e-mail e senha | usuário e papel, com cookie de sessão |
| Front → Spring | `POST /api/uploads` | nome do arquivo, total de linhas lidas e as linhas válidas (JSON) | a telemetria após o processamento |
| Spring → Python | `POST /etl` | `{ "telemetriaId", "recebidas", "linhas" }` | `{ "ok": true }` ou erro (o envio vira `ERRO_ETL`) |
| Front → Spring | `GET /api/uploads` | — | histórico de envios com o status |
| Front → Spring | `GET /api/dashboard` | — | estatísticas, gráficos, upsell e frases do envio mais recente |
| Front → Spring | `GET /api/clientes` | — | a carteira do envio mais recente (tela Relatórios) |

Detalhes de cada rota: `frontend-vue/API-CONTRATO.md`. Tabelas:
`database/README.md`.

**Cada planilha enviada é a carteira completa naquele momento.** Os clientes
ficam ligados ao envio (`telemetria_id`), e o Dashboard mostra o envio mais
recente com status `NORMALIZADO`. Assim, os números sempre batem com a última
planilha, e os envios anteriores continuam guardados no histórico.

## 5. Situação da integração

O modo API do Vue envia os lotes ao Spring e consulta o histórico, a carteira
e os indicadores persistidos. O Spring valida as linhas, aplica os papéis
e envia os lotes ao FastAPI. O esquema compartilhado e o fluxo foram
verificados com PostgreSQL local. A configuração do banco e dos serviços
compartilhados segue o [guia do backend](../backend-java/README.md).

## 6. O que pode ser apontado como erro na apresentação

1. **O front calculando estatísticas e upsell.** Pelo fluxo, quem calcula é o
   Python. O front só desenha.
2. **Dados guardados no navegador** (`localStorage`). Pelo fluxo, os dados
   passam pelo Spring e ficam no banco.
3. **Login de demonstração:** o link "Entrar com a conta de demonstração" só existe no modo simulado e some quando o back-end for ligado.
4. **Login sem back-end.** As permissões precisam valer no Spring, não só
   escondendo botões no front.

## 7. Ordem de trabalho

1. Banco: `schema.sql` no Neon (Ryan), seguindo `database/README.md`.
2. Python: gravar no modelo do banco e calcular o upsell (feito).
3. Java: login, `POST /api/uploads` (DTO + Service), `PythonEtlService`,
   `GET /api/dashboard`, `GET /api/uploads` e `GET /api/clientes`.
4. Front: enviar ao Spring com Axios e desenhar o
   Dashboard com o que o back-end devolve.
5. Ensaio da apresentação, seguindo os passos 1 a 9 da seção 2.
