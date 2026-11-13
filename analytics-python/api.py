# ============================================================================
# api.py — a "porta de entrada" do Python para o DEPLOY: transforma o ETL em uma API (FastAPI).
# O Spring chama POST /etl enviando TODAS as linhas da planilha; o Python separa as boas das ruins,
# calcula e GRAVA no banco. As ruins ficam guardadas para a "planilha de correção".
# Como ligar:  uvicorn api:app --port 8000        (documentação automática em http://localhost:8000/docs)
# ============================================================================
import logging                                                                      # logging: escreve mensagens no terminal
import os                                                                           # os: lê variáveis de ambiente (ETL_API_KEY)
from typing import Any                                                              # Any: "qualquer tipo" (valores das linhas)

from fastapi import FastAPI, Header, HTTPException, Response                        # FastAPI: cria a API; Header: lê cabeçalhos; HTTPException: devolve erro HTTP
import pandas as pd                                                                 # pandas: tabelas de dados
from pydantic import BaseModel                                                      # BaseModel: descreve o formato do JSON que o Spring envia

import config  # noqa: F401  (carrega o .env antes de tudo)                         # config.py: carrega o .env (senha do banco, ETL_API_KEY)
from analise import calcular                                                        # calcular: indicadores e frases (analise.py)
from correcao import gerar_xlsx                                                     # gerar_xlsx: monta a planilha de correção (correcao.py)
from limpeza import tratar                                                          # tratar: limpeza (limpeza.py)
from main import LoteIndisponivel, processar_lote                                   # processar_lote: trata, calcula e grava no banco

logging.basicConfig(level=logging.INFO)                                             # mostra as mensagens INFO no terminal
log = logging.getLogger("analytics")                                                # logger desta API
app = FastAPI(title="CTI Insights — ETL em Python")                                 # app: a aplicação web
_engine = None                                                                      # conexão com o banco (criada na primeira vez que for usada)
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"          # tipo do arquivo .xlsx


class Pedido(BaseModel):                                                            # Pedido: o formato do JSON enviado pelo Spring
    loteId: int                                                                     # id do lote no banco (o Spring cria com status AGUARDANDO_ETL)
    recebidas: int                                                                  # total de linhas da planilha (para o relatório de qualidade)
    linhas: list[dict[str, Any]]                                                    # TODAS as linhas; mande "numeroLinha" em cada uma (nº da linha na planilha)


def _engine_banco():                                                                # devolve a conexão com o banco (cria só uma vez)
    global _engine                                                                  # usa a variável de fora da função
    if _engine is None:                                                             # ainda não existe?
        import banco                                                                # banco.py: único arquivo que fala com o banco
        _engine = banco.criar_engine()                                              # abre a conexão
    return _engine                                                                  # devolve


def _checar_chave(enviada: str | None) -> None:                                     # _checar_chave: só o Spring (que conhece a chave) pode chamar
    chave = os.getenv("ETL_API_KEY", "").strip()                                    # chave combinada com o Spring (vazia = sem chave, só para estudo)
    if chave and enviada != chave:                                                  # há chave configurada e a enviada não confere?
        raise HTTPException(status_code=401, detail="Chave do ETL inválida.")       # recusa: 401 não autorizado


@app.get("/saude")                                                                  # GET /saude: o Spring (ou você) confere se a API está de pé
def saude() -> dict:                                                                # função chamada nesse endereço
    return {"status": "ok"}                                                         # resposta simples (sem chave: o Render usa para health check)


@app.post("/etl")                                                                   # POST /etl: recebe o lote, processa e grava no banco
def etl(pedido: Pedido, x_etl_key: str | None = Header(default=None)) -> dict:      # x_etl_key: cabeçalho X-ETL-Key
    _checar_chave(x_etl_key)                                                        # confere a chave
    if not pedido.linhas:                                                           # veio vazio?
        raise HTTPException(status_code=422, detail="Nenhuma linha foi enviada.")   # 422: dados inválidos
    try:                                                                            # tenta processar
        r = processar_lote(_engine_banco(), pedido.loteId, pedido.linhas, pedido.recebidas)  # trata, calcula e grava
    except LoteIndisponivel as e:                                                   # lote inexistente ou já processado
        raise HTTPException(status_code=409, detail=str(e))                         # 409: conflito (não adianta tentar de novo)
    if not r["ok"] and r["validas"] == 0 and r["rejeitadas"] > 0:                   # todas as linhas eram ruins
        raise HTTPException(status_code=422, detail=r["mensagem"])                  # 422: o problema está nos dados (planilha de correção disponível)
    if not r["ok"]:                                                                 # outra falha (banco, bug...)
        raise HTTPException(status_code=500, detail=r["mensagem"])                  # 500: erro no servidor (o lote já está como ERRO)
    return {"ok": True, "loteId": pedido.loteId, "validas": r["validas"], "rejeitadas": r["rejeitadas"]}  # 200: deu certo


@app.get("/lotes/{lote_id}/correcao.xlsx")                                          # GET: baixa a planilha de correção de um lote
def planilha_correcao(lote_id: int, x_etl_key: str | None = Header(default=None)) -> Response:
    _checar_chave(x_etl_key)                                                        # só o Spring chama (ele repassa o arquivo ao front)
    import banco                                                                    # banco.py
    rejeitadas = banco.buscar_rejeitadas(_engine_banco(), lote_id)                  # lê as recusadas do lote
    if not rejeitadas:                                                              # nada recusado
        raise HTTPException(status_code=404, detail="Este lote não tem linhas recusadas.")  # 404: não há o que baixar
    return Response(gerar_xlsx(rejeitadas), media_type=XLSX,                        # devolve o arquivo .xlsx
                    headers={"Content-Disposition": f'attachment; filename="correcao-lote-{lote_id}.xlsx"'})


@app.post("/testar")                                                                # POST /testar: teste sem banco (não grava nada)
def testar(linhas: list[dict[str, Any]], x_etl_key: str | None = Header(default=None)) -> dict:  # recebe só a lista de clientes (como amostras/clientes.json)
    _checar_chave(x_etl_key)                                                        # em produção também exige a chave
    res = tratar(pd.DataFrame(linhas).astype(object))                               # limpa
    rejeitadas = res.rejeitadas.astype(object).where(res.rejeitadas.notna(), None).to_dict("records")  # recusadas (NaN vira null)
    if res.tratado.empty:                                                           # nenhuma linha boa
        return {"resultado": None, "rejeitadas": rejeitadas}                        # só as recusadas
    return {"resultado": calcular(res, len(linhas)), "rejeitadas": rejeitadas}      # números, frases e recusadas
