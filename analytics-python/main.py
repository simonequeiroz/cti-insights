"""Entrada do trabalho do Python: processar_lote (chamado pela API em api.py).

O Spring envia TODAS as linhas da planilha; aqui elas são limpas e validadas (limpeza.py),
as boas são calculadas (analise.py) e gravadas no banco (banco.py), e as ruins ficam
guardadas para o usuário baixar a "planilha de correção", corrigir e enviar de novo.
"""
from __future__ import annotations                                                  # recurso do Python para tipos mais flexíveis

import logging                                                                      # logging: escreve mensagens no terminal

import pandas as pd                                                                 # pandas: tabelas de dados

from analise import calcular                                                        # calcular: gera os indicadores e as frases (analise.py)
from limpeza import tratar                                                          # tratar: limpa e padroniza os dados (limpeza.py)

log = logging.getLogger("analytics")                                                # logger do programa


class LoteIndisponivel(Exception):                                                  # erro: o lote não existe ou não está AGUARDANDO_ETL
    """O lote não existe ou já foi/está sendo processado (a API responde 409)."""


def processar_lote(engine, lote_id: int, linhas: list[dict], recebidas: int) -> dict:  # processar_lote: trata, calcula e GRAVA um lote vindo do backend
    """Devolve {"ok", "validas", "rejeitadas", "mensagem"}. Lança LoteIndisponivel se o lote não puder ser processado."""
    import banco                                                                    # banco.py: funções que gravam no banco
    if not banco.reservar_lote(engine, lote_id, so_pendente=True):                  # marca PROCESSANDO (só se o lote ainda estava AGUARDANDO_ETL)
        raise LoteIndisponivel(f"Lote {lote_id} não existe ou não está aguardando ETL.")  # a API transforma em 409
    try:                                                                            # tenta processar
        if not linhas:                                                              # o backend não mandou nenhuma linha?
            raise ValueError("o backend não enviou linhas")                         # erro explicando
        bruto = pd.DataFrame(linhas).astype(object)                                 # lista de dicionários vira tabela do pandas
        res = tratar(bruto)                                                         # limpa e separa boas e ruins
        if res.tratado.empty:                                                       # nenhuma linha boa?
            banco.gravar_so_rejeitadas(engine, lote_id, res.rejeitadas)             # guarda as ruins mesmo assim (para a planilha de correção)
            msg = f"Nenhuma linha válida: {len(res.rejeitadas)} recusadas (baixe a planilha de correção)."
            banco.marcar_erro(engine, lote_id, msg)                                 # lote fica ERRO, com a mensagem
            return {"ok": False, "validas": 0, "rejeitadas": len(res.rejeitadas), "mensagem": msg}
        payload = calcular(res, recebidas)                                          # calcula média, mediana, agrupamentos e frases
        banco.gravar_resultado(engine, lote_id, res.tratado, payload, res.rejeitadas)  # GRAVA clientes, contratos, recusadas e o JSON
        log.info("Lote %s processado: %s válidas, %s recusadas.", lote_id, len(res.tratado), len(res.rejeitadas))
        return {"ok": True, "validas": len(res.tratado), "rejeitadas": len(res.rejeitadas), "mensagem": "ETL concluído."}
    except Exception as e:  # noqa: BLE001 - qualquer falha deve aparecer na tela do usuário
        log.exception("Falha no lote %s", lote_id)                                  # escreve o erro completo no terminal
        banco.marcar_erro(engine, lote_id, f"Falha no ETL: {e}")                    # grava ERRO no lote para a tela mostrar
        return {"ok": False, "validas": 0, "rejeitadas": 0, "mensagem": f"Falha no ETL: {e}"}
