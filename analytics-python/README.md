# Ciência de dados — Python (pandas + FastAPI)

Recebe do backend (Spring Boot) as linhas **já validadas** e faz o ETL:
- **limpeza.py** padroniza (`ana souza` → `Ana Souza`, `IND.` → `Indústria`, texto → número e data)
- **analise.py** calcula (média, mediana, desvio padrão, quartis, totais por segmento, nível, consultor, serviço e mês, e correlação)
- **insights.py** escreve as frases
- **upsell.py** encontra os clientes com oportunidade de contratar mais serviços e o segmento com potencial
- **banco.py** grava no PostgreSQL do Neon (cliente, consultor, serviço, contrato, o resultado das contas em `estatistica` e as frases em `insight`) e atualiza o status do envio em `telemetria`

O Python **não devolve dados** ao backend: o `POST /etl` responde só `{"ok": true, "telemetriaId": ...}`. O backend lê o resultado no banco.

## Rodar
```
cd analytics-python
python -m venv .venv
.venv\Scripts\activate            (Mac/Linux: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env            (preencha com os dados de Connection Details do painel do Neon)
uvicorn api:app --port 8000
```
Teste: http://localhost:8000/saude → `{"status":"ok"}` e http://localhost:8000/docs (tela de teste; use `/testar` com `amostras/clientes.json`, não grava nada).

Esperado no `/testar` com `amostras/clientes.json`: 2 clientes, média 1135000.0, mediana 1135000.0 e desvio padrão 1011162.7.

Conexão com o banco: `python testar_conexao.py` deve mostrar `Conectou!`.

Hipótese H01 da Sprint 1: `python teste_h01.py` envia 100 registros com erros de grafia ao `/testar` e confere a padronização (não grava nada).

## Arquivos
```
api.py              recebe o POST /etl (e o /testar) e chama o main.py
main.py             coordena: confere o envio, limpa, calcula e grava
limpeza.py          limpa e padroniza
analise.py          faz as contas
insights.py         escreve as frases
upsell.py           encontra as oportunidades de upsell
banco.py            único arquivo que fala com o banco
config.py           lê o .env
testar_conexao.py   confere a conexão com o banco
amostras/           JSON de exemplo para testar sem backend e sem banco
```

## Gráficos de estatística (bloco `graficos`)
O Dashboard mostra três gráficos do faturamento: **dispersão**, **histograma**
e **boxplot**. Enquanto o `analise.py` não envia o bloco `graficos`, o front
calcula com a lista de clientes ([`utils/estatistica.js`](../frontend-vue/src/utils/estatistica.js)),
com o mesmo método do pandas e do scipy (conferido: diferença menor que 10⁻¹²).
Com filtro ligado, o front sempre calcula, como no resto da tela.

Para o Python passar a enviar esses números, acrescente ao JSON de
`calcular()` (os valores são números simples, sem formatação):

```json
"graficos": {
  "dispersao": [{ "nome": "Hospital Vida", "servicos": 3, "faturamento": 6900000.0 }],
  "histograma": [{ "de": 0, "ate": 2000000, "clientes": 20 }],
  "boxplot": {
    "minimo": 390000.0, "q1": 862500.0, "mediana": 1500000.0, "q3": 3150000.0, "maximo": 7200000.0,
    "limiteInferior": -2568750.0, "limiteSuperior": 6581250.0,
    "bigodeInferior": 390000.0, "bigodeSuperior": 5400000.0,
    "outliers": [{ "nome": "Hospital Vida", "faturamento": 6900000.0 }]
  }
}
```

Regras, iguais às do front:
- **Quartis:** `Series.quantile()` (método linear, o padrão do pandas).
- **Outliers:** abaixo de `Q1 − 1,5 × IQR` ou acima de `Q3 + 1,5 × IQR`. Os
  bigodes vão até o último cliente dentro desses limites.
- **Histograma:** faixas de tamanho "redondo" (1, 2, 2,5 ou 5 × 10ⁿ). O número
  de faixas segue a regra de Sturges (`1 + log₂ n`), entre 3 e 10. Cada faixa
  inclui o início e exclui o fim; a última inclui também o fim.
- **Correlação:** o gráfico usa o bloco `correlacao`, que já existe. Se
  `p ≥ 0,05`, a tela escreve "Sem relação clara".

## Deploy
Comando: `uvicorn api:app --host 0.0.0.0 --port $PORT` (rode dentro da pasta `analytics-python`).
Variáveis: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSLMODE=require`, `ETL_API_KEY`.

O `.env` tem a senha do banco e **não vai para o Git**.

## Situação atual
Integrado. O backend chama o `POST /etl` a cada planilha enviada, e o Python grava o resultado nas tabelas do Neon. O fluxo completo, do upload ao dashboard, foi testado de ponta a ponta.
