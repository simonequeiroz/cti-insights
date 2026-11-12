"""Entrada do trabalho do Python: processar_lote (chamado pela API em api.py).

O Spring envia as linhas válidas; aqui elas são limpas (limpeza.py), calculadas (analise.py)
e gravadas no Azure (banco.py).
"""
from __future__ import annotations                                                  # recurso do Python para tipos mais flexíveis

import logging                                                                      # logging: escreve mensagens no terminal

import pandas as pd                                                                 # pandas: tabelas de dados

from analise import calcular                                                        # calcular: gera os indicadores e as frases (analise.py)
from limpeza import tratar                                                          # tratar: limpa e padroniza os dados (limpeza.py)

log = logging.getLogger("analytics")                                                # logger do programa


def processar_lote(engine, lote_id: int, linhas: list[dict], recebidas: int) -> bool:  # processar_lote: trata, calcula e GRAVA no Azure um lote vindo do backend
    import banco                                                                    # banco.py: funções que gravam no banco Azure
    if not banco.reservar_lote(engine, lote_id, so_pendente=True):                  # marca PROCESSANDO (só se o lote ainda estava AGUARDANDO_ETL)
        log.warning("Lote %s não está disponível para processamento.", lote_id)    # não deu: avisa
        return False                                                                # devolve falso
    try:                                                                            # tenta processar
        if not linhas:                                                              # o backend não mandou nenhuma linha?
            raise ValueError("o backend não enviou linhas válidas")                 # erro explicando
        bruto = pd.DataFrame(linhas).astype(object)                                 # lista de dicionários vira tabela do pandas
        res = tratar(bruto)                                                         # limpa os dados
        payload = calcular(res, recebidas)                                          # calcula média, mediana, agrupamentos e frases
        banco.gravar_resultado(engine, lote_id, res.tratado, payload, len(res.rejeitadas))  # GRAVA clientes, contratos e o JSON no Azure
        log.info("Lote %s processado.", lote_id)                                    # registra no terminal
        return True                                                                 # deu certo
    except Exception as e:  # noqa: BLE001 - qualquer falha deve aparecer na tela do usuário
        log.exception("Falha no lote %s", lote_id)                                  # escreve o erro completo no terminal
        banco.marcar_erro(engine, lote_id, f"Falha no ETL: {e}")                    # grava ERRO no lote para a tela mostrar
        return False                                                                # devolve falso
