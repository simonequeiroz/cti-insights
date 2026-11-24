"""API interna chamada pelo backend Java."""
import hmac
import os
from functools import cache
from typing import Any

import pandas as pd
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

from analise import calcular
from banco import criar_engine
from limpeza import tratar
from main import processar_lote

app = FastAPI(title="CTI Insights — ETL em Python")


class Pedido(BaseModel):
    telemetriaId: int
    recebidas: int
    linhas: list[dict[str, Any]]


@cache
def _engine_banco():
    return criar_engine()


@app.get("/saude")
def saude() -> dict:
    return {"status": "ok"}


@app.post("/etl")
def etl(pedido: Pedido, x_etl_key: str | None = Header(default=None)) -> dict:
    chave = os.getenv("ETL_API_KEY", "").strip()
    if not chave:
        raise HTTPException(status_code=503, detail="Chave do ETL não configurada.")
    if not x_etl_key or not hmac.compare_digest(x_etl_key.encode(), chave.encode()):
        raise HTTPException(status_code=401, detail="Chave do ETL inválida.")
    if not pedido.linhas and pedido.recebidas != 0:
        raise HTTPException(status_code=422, detail="Nenhuma linha válida foi enviada.")

    if not processar_lote(_engine_banco(), pedido.telemetriaId, pedido.linhas, pedido.recebidas):
        raise HTTPException(status_code=500, detail="Falha no ETL (veja o terminal do Python).")
    return {"ok": True, "telemetriaId": pedido.telemetriaId}


@app.post("/testar")
def testar(linhas: list[dict[str, Any]]) -> dict:
    """Calcula indicadores de exemplo sem gravar no banco."""
    resultado = tratar(pd.DataFrame(linhas).astype(object))
    return calcular(resultado, len(linhas))
