"""Processa um envio reservado e persiste a carteira e seus indicadores."""
import logging

import pandas as pd

import banco
from analise import calcular
from limpeza import tratar

log = logging.getLogger("analytics")


def processar_lote(engine, telemetria_id: int, linhas: list[dict], recebidas: int) -> bool:
    operacao = banco.reservar_lote(engine, telemetria_id)
    if operacao is None:
        log.warning("Envio %s não está disponível para processamento.", telemetria_id)
        return False

    try:
        if not linhas and (operacao != "EXCLUSAO_CLIENTE" or recebidas != 0):
            raise ValueError("O backend não enviou linhas válidas.")

        resultado = tratar(pd.DataFrame(linhas).astype(object))
        if linhas and resultado.tratado.empty:
            raise ValueError("Nenhuma linha foi aceita pelo ETL.")
        if operacao != "UPLOAD" and not resultado.rejeitadas.empty:
            raise ValueError("A operação manual deve preservar os demais clientes.")

        indicadores = calcular(resultado, recebidas, permitir_vazio=not linhas)
        banco.gravar_resultado(engine, telemetria_id, resultado.tratado,
                              indicadores, len(resultado.rejeitadas))
        log.info("Envio %s processado.", telemetria_id)
        return True
    except Exception:
        log.exception("Falha no envio %s", telemetria_id)
        banco.marcar_erro(engine, telemetria_id, "Falha ao processar a carteira no ETL.")
        return False
