# Requisitos do banco de dados: o que o ETL Python precisa

**Para:** squad do banco · **De:** squad de dados (Python)
**Status:** requisitos. Os nomes são sugestão: se o schema oficial usar outros, a squad de dados ajusta o `banco.py`. Só a **estrutura** precisa existir.

Um SQL de referência está em `docs/tabelas-esperadas-pelo-python.sql`. Ele serve como exemplo e pra criar um banco de teste. Não é o schema oficial.

---

## 1. Visão geral

| Tabela | Para quê | Quem escreve | Quem lê |
|---|---|---|---|
| `upload_lote` | Uma linha por planilha enviada (a "Telemetria" do diagrama) | Java cria; Python atualiza `status` e `mensagem` | Java (histórico de envios) |
| `consultor` | Consultores, sem repetir | Python | Java |
| `servico` | Serviços, sem repetir | Python | Java |
| `cliente` | Clientes válidos de cada lote | Python | Java (`GET /clientes`) |
| `contrato` | Um registro por serviço contratado pelo cliente | Python | Java |
| `estatistica_lote` | JSON com as contas do dashboard | Python | Java (dashboard) |
| `linha_rejeitada` | Linhas recusadas, para a planilha de correção | Python | Python (gera o `.xlsx`) |

Relações:
```
upload_lote 1──N cliente N──1 consultor
     │              │
     │              └─1──N contrato N──1 servico
     ├─1──1 estatistica_lote
     └─1──N linha_rejeitada
```

---

## 2. Tabelas

### 2.1 `upload_lote`
| Coluna | Tipo | Obrigatória | Observação |
|---|---|---|---|
| `id` | inteiro, auto incremento | sim | O Java passa esse id no `POST /etl` (`loteId`) |
| `status` | texto (20) | sim | Valores na seção 3. Padrão `AGUARDANDO_ETL` |
| `mensagem` | texto (até 500) | não | O Python escreve até 480 caracteres |
| `nome_arquivo`, `linhas_lidas`, `criado_em`, usuário que enviou... | — | — | **Definidos pelo Java/banco.** O Python não usa |

### 2.2 `consultor` e `servico`
| Coluna | Tipo | Obrigatória | Observação |
|---|---|---|---|
| `id` | inteiro, auto incremento | sim | |
| `nome` | texto (120) | sim | **UNIQUE obrigatório.** O Python usa `INSERT ... ON CONFLICT (nome) DO NOTHING` |

### 2.3 `cliente`
| Coluna | Tipo | Obrigatória | Observação |
|---|---|---|---|
| `id` | inteiro grande, auto incremento | sim | O Python precisa do id de volta (`RETURNING id`) |
| `lote_id` | FK → `upload_lote.id` | sim | **ON DELETE CASCADE** |
| `codigo_cti` | texto (60) | sim | Código da planilha, em maiúsculas |
| `nome` | texto (255) | sim | |
| `consultor_id` | FK → `consultor.id` | sim | |
| `segmento` | texto (40) | sim | Já padronizado: Indústria, Comércio, Serviços, Saúde, Educação, Tecnologia |
| `nivel` | 1 caractere | sim | `A`, `B` ou `C` |
| `faturamento_anual` | decimal (15,2) | sim | ≥ 0 |
| `cidade` | texto (120) | não | |
| `uf` | 2 caracteres | não | |

Restrição recomendada: `UNIQUE (lote_id, codigo_cti)`. O Python já remove códigos repetidos dentro do mesmo lote.

### 2.4 `contrato`
| Coluna | Tipo | Obrigatória | Observação |
|---|---|---|---|
| `id` | inteiro, auto incremento | recomendado | |
| `cliente_id` | FK → `cliente.id` | sim | **ON DELETE CASCADE** (o Python apaga clientes ao reprocessar e conta com isso) |
| `servico_id` | FK → `servico.id` | sim | |
| `data_contratacao` | data | sim | |

Se o grupo decidir usar `status_contrato` e `data_fim_contrato` (colunas opcionais da planilha), elas entram aqui. Avisem a squad de dados.

### 2.5 `estatistica_lote`
| Coluna | Tipo | Obrigatória | Observação |
|---|---|---|---|
| `lote_id` | FK → `upload_lote.id`, **chave primária** | sim | Um resultado por lote. **ON DELETE CASCADE** |
| `gerado_em` | data/hora | sim | Em UTC, sem fuso (igual ao que o Spring grava) |
| `resultado` | **JSONB** | sim | O Python grava com `CAST(... AS JSONB)`. Se for `TEXT`, avisem |

Formato do JSON: chaves `resumo`, `porSegmento`, `porNivel`, `porConsultor`, `porServico`, `porMes`, `correlacao`, `topClientes`, `qualidade` e `insights`. Os detalhes estão no `analise.py`.

### 2.6 `linha_rejeitada` (nova: planilha de correção)
| Coluna | Tipo | Obrigatória | Observação |
|---|---|---|---|
| `id` | inteiro grande, auto incremento | sim | |
| `lote_id` | FK → `upload_lote.id` | sim | **ON DELETE CASCADE**. Precisa de **índice** |
| `linha` | inteiro | não | Número da linha na planilha original |
| `dados` | **JSONB** | sim | As 10 colunas da planilha, como o usuário digitou |
| `motivo` | texto (1000) | sim | Ex.: `nivel_cliente: 'E' fora de A/B/C` |

Por que JSONB em `dados`: a linha recusada pode ter qualquer coisa errada, como texto no lugar de número ou uma data inválida. Por isso ela não cabe nas colunas tipadas de `cliente`.

---

## 3. Status do lote

O `status` de `upload_lote` precisa aceitar estes valores. Recomendo um `CHECK`:

| Status | Quem coloca | Significado |
|---|---|---|
| `AGUARDANDO_ETL` | Java, ao criar | Planilha recebida, esperando o Python |
| `PROCESSANDO` | Python | ETL em andamento |
| `PROCESSADO` | Python | Terminou (pode ter linhas recusadas) |
| `ERRO` | Python | Falhou, ou nenhuma linha era válida. O motivo fica em `mensagem` |
| `REJEITADO` | Java (opcional) | Recusado antes do ETL |

O Python só processa lotes em `AGUARDANDO_ETL`. Ele usa um `UPDATE ... WHERE status = 'AGUARDANDO_ETL'` atômico, o que evita processar o mesmo lote duas vezes. O front espera `NORMALIZADO` e `ERRO_SCHEMA` (veja o `PROPOSTA-ETL.md`, seção 3). A sugestão é o Java traduzir, sem mudar os valores no banco.

---

## 4. Comportamentos de que o Python depende

1. **Transação única por lote:** clientes, contratos, rejeitadas, estatísticas e o status `PROCESSADO` são gravados juntos. Se algo falhar, nada fica pela metade.
2. **Reprocessamento:** o Python faz `DELETE FROM cliente WHERE lote_id = ...` e espera que os **contratos saiam em cascata**.
3. **Apagar um lote** precisa apagar tudo dele em cascata: clientes, contratos, estatísticas e rejeitadas. Isso cobre o "apagar dados/histórico" do Administrador.
4. **`RETURNING id`** em `cliente`: o Python precisa do id gerado pra gravar os contratos.

---

## 5. Neon (hospedagem)

- Conexão com SSL obrigatória (`sslmode=require`).
- Use a string **sem `-pooler`**. A conexão direta funciona com Java, Python e DBeaver.
- O plano grátis tem poucas conexões: o Java deve usar no máximo 5 (`hikari.maximum-pool-size=5`).
- Região: a mesma dos serviços no Render (sugestão: **US East / Ohio**). O ETL faz cerca de 100 comandos por planilha, e cada ida e volta entre regiões diferentes custa uns 100 ms.

---

## 6. Perguntas para a squad do banco

1. Quem cria as tabelas: o Spring (`schema.sql` com `spring.sql.init`), um script rodado à mão ou migrações (Flyway)?
2. A base de clientes é **por lote** (cada envio tem a sua) ou **única** (os envios se somam)? Isso define se `cliente` precisa de `lote_id` e responde à questão do reenvio da planilha de correção (`PROPOSTA-ETL.md`, seção 2).
3. Onde fica a tabela de usuários (login, papel, aprovação)? Ela não envolve o Python, mas `upload_lote` provavelmente vai referenciar quem enviou.
