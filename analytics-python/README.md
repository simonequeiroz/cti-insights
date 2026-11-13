# Ciência de dados — Python (pandas + FastAPI)

Recebe do backend (Spring Boot) as linhas **já validadas** e faz o ETL:
- **limpeza.py** padroniza (`ana souza` → `Ana Souza`, `IND.` → `Indústria`, texto → número e data)
- **analise.py** calcula (média, mediana, desvio padrão, quartis, totais por segmento, nível, consultor, serviço e mês, e correlação)
- **insights.py** escreve as frases
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

## Arquivos
```
api.py              recebe o POST /etl (e o /testar) e chama o main.py
main.py             coordena: confere o envio, limpa, calcula e grava
limpeza.py          limpa e padroniza
analise.py          faz as contas
insights.py         escreve as frases
banco.py            único arquivo que fala com o banco
config.py           lê o .env
testar_conexao.py   confere a conexão com o banco
amostras/           JSON de exemplo para testar sem backend e sem banco
```

## Deploy
Comando: `uvicorn api:app --host 0.0.0.0 --port $PORT` (rode dentro da pasta `analytics-python`).
Variáveis: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSLMODE=require`, `ETL_API_KEY`.

O `.env` tem a senha do banco e **não vai para o Git**.

## Situação atual
Os arquivos Python e o teste sem banco (`/saude` e `/testar`) estão prontos. Ainda faltam a chamada do backend (`PythonEtlService.java`) e as tabelas no Neon; até lá, o `POST /etl` não tem banco para gravar.
