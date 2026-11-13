# Proposta: integração do ETL Python com Java, front e banco

**Status: PROPOSTA da squad de dados.** Precisa ser aprovada pelas squads de Java e de front.
O Python já funciona do jeito descrito aqui (testado com a `dados.xlsx`: 32 válidas, 6 recusadas,
61 contratos, média R$ 2.261.250).

## 1. Fluxo do upload (decidido: importa as boas, as ruins viram planilha de correção)

```
Front ──(arquivo)──► Java ──POST /etl (TODAS as linhas)──► Python ──► banco
                      │                                     ├─ boas: cliente, contrato, estatistica_lote
                      │                                     └─ ruins: linha_rejeitada (valores originais + motivo)
                      └──GET /lotes/{id}/correcao.xlsx──► Python  (Java repassa o arquivo ao front)
```

1. Java cria o registro em `upload_lote` com `status = 'AGUARDANDO_ETL'`.
2. Java chama `POST /etl` com **todas** as linhas da planilha (não só as válidas), cada uma com `numeroLinha`.
   O Python é quem decide o que é válido; assim existe **um lugar só** com as regras.
3. Python grava as boas, guarda as ruins e marca o lote como `PROCESSADO` (ou `ERRO`).
4. O front mostra "X importadas, Y recusadas" e um botão **Baixar planilha de correção**,
   que chama uma rota do Java (sugestão: `GET /api/uploads/{id}/correcao.xlsx`), que repassa o `.xlsx` do Python.
5. A planilha de correção tem as mesmas 10 colunas da original, com a coluna `motivo_recusa`
   (ignorada no reenvio). O usuário corrige e envia de novo.

Chamada do Java ao Python: cabeçalho `X-ETL-Key` com a chave combinada (`ETL_API_KEY` no Python).
Respostas: 200 ok · 409 lote não está aguardando · 422 nenhuma linha válida · 500 falha.

## 2. ⚠️ Decisão necessária: o reenvio da correção é complemento ou base nova?

O `API-CONTRATO.md` do front diz que `GET /clientes` devolve **a base do lote válido mais recente**.
Se a planilha de correção (só com as linhas corrigidas) for tratada como um lote novo,
**a base passa a ter só essas linhas**. Opções:

| Opção | Como funciona | Custo |
|---|---|---|
| **A. Complemento (recomendada)** | O reenvio leva `loteOrigemId`; os clientes corrigidos entram na base do lote original e as estatísticas são recalculadas | Java manda um campo a mais; Python ganha uma rota de "complementar lote" |
| B. Base = todos os lotes | `GET /clientes` junta os clientes de todos os lotes processados (o mais recente vence em código repetido) | Muda a regra do front; uma base "suja" antiga nunca some |
| C. Sem reenvio parcial | O usuário corrige a planilha **original** e reenvia o arquivo inteiro; a de correção serve só como guia | Zero código novo; mais trabalho para o usuário |

## 3. Status do lote: alinhar com o front

| Python / banco (hoje) | Front (`API-CONTRATO.md`) | Sugestão |
|---|---|---|
| `AGUARDANDO_ETL`, `PROCESSANDO` | `PROCESSANDO` | Java devolve `PROCESSANDO` para os dois |
| `PROCESSADO` | `NORMALIZADO` | Java traduz, ou o front passa a usar `PROCESSADO` |
| `ERRO` | `ERRO_SCHEMA` | idem |

A tradução fica no Java (um `switch`), sem mexer no banco nem no Python.

## 4. Regras de validação que divergem do front

| Regra | Front hoje | Python hoje | Decidir |
|---|---|---|---|
| `faturamento_anual` vazio | aceita (conta como 0) | recusa a linha | Se aceitar, troque em `limpeza.py` (`OBRIGATORIAS`) |
| `status_contrato`, `data_fim_contrato` | colunas opcionais | ignora | Se forem usadas, entram em `limpeza.py`, `banco.py` e `schema.sql` (tabela `contrato`) |
| Arquivo com erro | recusa o arquivo inteiro | importa as boas | **Decidido: importa as boas** (o front precisa mudar) |

## 5. Banco (responsabilidade da squad do banco)

O `database/schema.sql` do grupo ainda está vazio. Para não implementar a parte de outra squad,
as tabelas que o Python precisa estão descritas em `docs/tabelas-esperadas-pelo-python.sql`,
como **referência**: `upload_lote` (com `status` e `mensagem`), `consultor`, `servico`, `cliente`,
`contrato`, `estatistica_lote` e a nova `linha_rejeitada` (planilha de correção).

Se o schema oficial usar outros nomes, a squad de dados ajusta só o `banco.py`
(é o único arquivo que fala com o banco).
