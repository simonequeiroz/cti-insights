"""Entrada do trabalho do Python: processar_lote (chamado pela API em api.py).

O Spring envia as linhas válidas; aqui elas são limpas (limpeza.py), calculadas (analise.py)
e gravadas no banco (banco.py).
"""
from __future__ import annotations                                                  # recurso do Python para tipos mais flexíveis

import logging                                                                      # logging: escreve mensagens no terminal

import pandas as pd                                                                 # pandas: tabelas de dados

from analise import calcular                                                        # calcular: gera os indicadores e as frases (analise.py)
from limpeza import tratar                                                          # tratar: limpa e padroniza os dados (limpeza.py)

log = logging.getLogger("analytics")                                                # logger do programa


def processar_lote(engine, telemetria_id: int, linhas: list[dict], recebidas: int) -> bool:  # processar_lote: trata, calcula e GRAVA no banco um envio vindo do backend
    import banco                                                                    # banco.py: funções que gravam no banco
    if not banco.reservar_lote(engine, telemetria_id):                              # confere se o envio ainda está PROCESSANDO
        log.warning("Envio %s não está disponível para processamento.", telemetria_id)  # não deu: avisa
        return False                                                                # devolve falso
    try:                                                                            # tenta processar
        if not linhas:                                                              # o backend não mandou nenhuma linha?
            raise ValueError("o backend não enviou linhas válidas")                 # erro explicando
        bruto = pd.DataFrame(linhas).astype(object)                                 # lista de dicionários vira tabela do pandas
        res = tratar(bruto)                                                         # limpa os dados
        payload = calcular(res, recebidas)                                          # calcula média, mediana, agrupamentos e frases
        banco.gravar_resultado(engine, telemetria_id, res.tratado, payload, len(res.rejeitadas))  # GRAVA clientes, contratos, estatísticas e frases
        log.info("Envio %s processado.", telemetria_id)                             # registra no terminal
        return True                                                                 # deu certo
    except Exception as e:  # noqa: BLE001 - qualquer falha deve aparecer na tela do usuário
        log.exception("Falha no envio %s", telemetria_id)                           # escreve o erro completo no terminal
        banco.marcar_erro(engine, telemetria_id, f"Falha no ETL: {e}")              # grava ERRO_ETL no envio para a tela mostrar
        return False                                                                # devolve falso
