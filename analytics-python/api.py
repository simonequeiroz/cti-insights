# ============================================================================
# api.py — a "porta de entrada" do Python para o DEPLOY: transforma o ETL em uma API (FastAPI).
# O Spring chama POST /etl enviando o JSON do envio; o Python limpa, calcula e GRAVA no banco.
# Como ligar:  uvicorn api:app --port 8000        (documentação automática em http://localhost:8000/docs)
# ============================================================================
import logging                                                                      # logging: escreve mensagens no terminal
import os                                                                           # os: lê variáveis de ambiente (ETL_API_KEY)
from typing import Any                                                              # Any: "qualquer tipo" (valores das linhas)

from fastapi import FastAPI, Header, HTTPException                                  # FastAPI: cria a API; Header: lê cabeçalhos; HTTPException: devolve erro HTTP
import pandas as pd                                                                 # pandas: tabelas de dados
from pydantic import BaseModel                                                      # BaseModel: descreve o formato do JSON que o Spring envia

import config                                                                       # config.py: carrega o .env (senha do banco, ETL_API_KEY)
from analise import calcular                                                        # calcular: indicadores e frases (analise.py)
from limpeza import tratar                                                          # tratar: limpeza (limpeza.py)
from main import processar_lote                                                     # processar_lote: trata, calcula e grava no banco

log = logging.getLogger("analytics")                                                # logger desta API
app = FastAPI(title="CTI Insights — ETL em Python")                                 # app: a aplicação web
_engine = None                                                                      # conexão com o banco (criada na primeira vez que for usada)


class Pedido(BaseModel):                                                            # Pedido: o formato do JSON enviado pelo Spring
    telemetriaId: int                                                               # id do envio (tabela telemetria)
    recebidas: int                                                                  # total de linhas que chegaram ao backend (para o relatório de qualidade)
    linhas: list[dict[str, Any]]                                                    # só as linhas válidas


def _engine_banco():                                                                # devolve a conexão com o banco (cria só uma vez)
    global _engine                                                                  # usa a variável de fora da função
    if _engine is None:                                                             # ainda não existe?
        import banco                                                                # banco.py: único arquivo que fala com o banco
        _engine = banco.criar_engine()                                              # abre a conexão
    return _engine                                                                  # devolve


@app.get("/saude")                                                                  # GET /saude: o Spring (ou você) confere se a API está de pé
def saude() -> dict:                                                                # função chamada nesse endereço
    return {"status": "ok"}                                                         # resposta simples


@app.post("/etl")                                                                   # POST /etl: recebe o envio, processa e grava no banco
def etl(pedido: Pedido, x_etl_key: str | None = Header(default=None)) -> dict:      # x_etl_key: cabeçalho X-ETL-Key
    chave = os.getenv("ETL_API_KEY", "").strip()                                    # chave combinada com o Spring (vazia = sem chave, só para estudo)
    if chave and x_etl_key != chave:                                                # há chave configurada e a enviada não confere?
        raise HTTPException(status_code=401, detail="Chave do ETL inválida.")       # recusa: 401 não autorizado
    if not pedido.linhas:                                                           # veio vazio?
        raise HTTPException(status_code=422, detail="Nenhuma linha válida foi enviada.")  # 422: dados inválidos
    ok = processar_lote(_engine_banco(), pedido.telemetriaId, pedido.linhas, pedido.recebidas)  # trata, calcula e grava no banco
    if not ok:                                                                      # deu errado? (o envio já foi marcado como ERRO_ETL no banco)
        raise HTTPException(status_code=500, detail="Falha no ETL (veja o terminal do Python).")  # 500: erro no servidor
    return {"ok": True, "telemetriaId": pedido.telemetriaId}                        # 200: deu certo


@app.post("/testar")                                                                # POST /testar: teste sem banco (não grava nada)
def testar(linhas: list[dict[str, Any]]) -> dict:                                   # recebe só a lista de clientes (como amostras/clientes.json)
    res = tratar(pd.DataFrame(linhas).astype(object))                               # limpa
    return calcular(res, len(linhas))                                               # calcula e devolve os números e as frases
