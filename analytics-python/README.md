# Ciência de dados — Python (pandas + FastAPI)

Recebe do backend (Spring Boot) **todas as linhas** da planilha e faz o ETL:
- **limpeza.py** padroniza (`ana souza` → `Ana Souza`, `IND.` → `Indústria`, texto → número e data) e separa as linhas boas das ruins
- **analise.py** calcula (média, mediana, desvio padrão, quartis, totais por segmento, nível, consultor, serviço e mês, e correlação)
- **insights.py** escreve as frases
- **correcao.py** monta a **planilha de correção**: um `.xlsx` só com as linhas recusadas, do jeito que o usuário digitou, com o motivo de cada uma
- **banco.py** grava no PostgreSQL (cliente, consultor, serviço, contrato, linhas recusadas e o resultado das contas em `estatistica_lote`) e atualiza o status do lote em `upload_lote`

As linhas boas são importadas; as ruins **não travam o envio**: ficam guardadas para o usuário baixar a planilha de correção, corrigir e enviar depois.

## Rodar
```
cd analytics-python
python -m venv .venv
source .venv/bin/activate          (Windows: .venv\Scripts\activate)
pip install -r requirements.txt
cp .env.example .env               (preencha DATABASE_URL com a string do Neon)
uvicorn api:app --port 8000
```
Teste: http://localhost:8000/saude → `{"status":"ok"}` e http://localhost:8000/docs (tela de teste).

O banco é responsabilidade de outra squad. As tabelas que este código espera estão descritas em `docs/tabelas-esperadas-pelo-python.sql` (referência, não o schema oficial).
Conexão com o banco: `python testar_conexao.py` deve mostrar `Conectou!`.

## Testes
```
python test_analytics.py
```
Para incluir o teste com banco, crie um banco **de teste** local com `docs/tabelas-esperadas-pelo-python.sql` e aponte `TEST_DATABASE_URL` para ele:
`TEST_DATABASE_URL=postgresql://... python test_analytics.py`

## Rotas
Todas, menos `/saude`, exigem o cabeçalho `X-ETL-Key` igual ao `ETL_API_KEY` do `.env` (vazio = sem chave, só para estudo).

| Rota | O que faz | Respostas |
|---|---|---|
| `GET /saude` | API está de pé? | 200 |
| `POST /etl` | `{"loteId", "recebidas", "linhas": [...]}`: processa e grava | 200 `{ok, loteId, validas, rejeitadas}` · 401 chave · 409 lote não está `AGUARDANDO_ETL` · 422 nenhuma linha válida (planilha de correção disponível) · 500 falha |
| `GET /lotes/{id}/correcao.xlsx` | Baixa a planilha de correção do lote | 200 arquivo · 404 lote sem recusadas |
| `POST /testar` | Teste sem banco: manda a lista de linhas | 200 `{resultado, rejeitadas}` |

Cada linha em `linhas` vem em camelCase (`codigoCliente`, `nomeCliente`, `consultor`, `segmento`, `nivelCliente`, `faturamentoAnual`, `servicosContratados`, `dataContratacao`, `cidade`, `uf`) **e com `numeroLinha`** (o número da linha na planilha), para a planilha de correção dizer onde cada erro estava.

Esperado no `/testar` com `amostras/clientes.json`: `resultado.resumo` com 2 clientes, média 1135000.0, mediana 1135000.0 e desvio padrão 1011162.7.

## Arquivos
```
api.py              rotas (POST /etl, GET /lotes/{id}/correcao.xlsx, /testar, /saude)
main.py             coordena: reserva o lote, limpa, calcula e grava
limpeza.py          limpa, padroniza e separa as recusadas
analise.py          faz as contas
insights.py         escreve as frases
correcao.py         monta a planilha de correção (.xlsx)
banco.py            único arquivo que fala com o banco
config.py           lê o .env (DATABASE_URL ou DB_HOST/DB_USER/... separados)
test_analytics.py   testes
testar_conexao.py   confere a conexão com o banco
amostras/           JSON de exemplo para testar sem backend e sem banco
```

## Deploy (Render)
Comando: `uvicorn api:app --host 0.0.0.0 --port $PORT` (Root Directory: `analytics-python`).
Variáveis: `DATABASE_URL` (string do Neon) e `ETL_API_KEY`.

O `.env` tem a senha do banco e **não vai para o Git**.

## Decisões em aberto
Veja `docs/PROPOSTA-ETL.md`.
