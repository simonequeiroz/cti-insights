"""Banco: GRAVA no PostgreSQL (Neon) os clientes, contratos, estatísticas e insights. As linhas chegam do backend.

Tabelas usadas (veja database/README.md): telemetria, consultor, servico, cliente, contrato,
contrato_servico, estatistica e insight.
"""
from __future__ import annotations                                                  # recurso do Python para tipos mais flexíveis

import json                                                                         # json: transforma dicionário em texto JSON
import logging                                                                      # logging: escreve mensagens no terminal
from datetime import datetime, timezone                                             # datetime e timezone: data e hora em UTC

import pandas as pd                                                                 # pandas: tabelas de dados (DataFrame)
from sqlalchemy import create_engine, text                                          # SQLAlchemy: create_engine abre a conexão; text escreve SQL
from sqlalchemy.engine import Engine                                                # tipo Engine (só para indicar o tipo)

from config import database_url                                                    # config: pega o endereço do banco do .env

log = logging.getLogger("analytics")                                                # logger do programa


def criar_engine() -> Engine:                                                       # criar_engine: abre a "porta" de conexão com o banco
    return create_engine(database_url(), pool_pre_ping=True)                        # pool_pre_ping testa a conexão antes de usar


def agora_utc() -> datetime:                                                        # agora_utc: hora atual em UTC
    """O Spring Boot grava TIMESTAMP em UTC (sem fuso); fazemos o mesmo."""
    return datetime.now(timezone.utc).replace(tzinfo=None)                          # o Spring grava em UTC sem fuso; fazemos igual


# ------------------------------------------------------------------- telemetria (cada envio de planilha)
def reservar_lote(engine: Engine, telemetria_id: int) -> bool:                      # reservar_lote: confere se o envio está esperando o ETL
    """Só processa envios com status PROCESSANDO (criados pelo backend e ainda sem resultado)."""
    with engine.begin() as conn:                                                    # abre uma transação (confirma ao sair do bloco)
        r = conn.execute(                                                           # executa o UPDATE
            text("UPDATE telemetria SET mensagem = 'ETL em andamento...' "          # avisa na mensagem que o ETL começou
                 "WHERE id = :id AND status = 'PROCESSANDO'"), {"id": telemetria_id})  # só se o envio ainda estiver PROCESSANDO
        return r.rowcount == 1                                                      # true se exatamente 1 envio foi encontrado


def marcar_erro(engine: Engine, telemetria_id: int, mensagem: str) -> None:         # marcar_erro: grava ERRO_ETL no envio
    with engine.begin() as conn:                                                    # abre uma transação
        conn.execute(text("UPDATE telemetria SET status = 'ERRO_ETL', mensagem = :m WHERE id = :id"),  # SQL: status ERRO_ETL e a mensagem
                     {"id": telemetria_id, "m": mensagem[:480]})                    # mensagem limitada a 480 caracteres


# ------------------------------------------------------------------------ carga
def gravar_resultado(engine: Engine, telemetria_id: int, tratado: pd.DataFrame, payload: dict, rejeitadas_etl: int) -> None:  # gravar_resultado: grava clientes, contratos, estatísticas e insights
    """Grava tudo em uma única transação: ou o envio inteiro é processado, ou nada muda."""
    with engine.begin() as conn:                                                    # uma transação só: ou grava tudo ou nada
        # reprocessar o mesmo envio substitui o resultado anterior
        conn.execute(text("DELETE FROM estatistica WHERE telemetria_id = :t"), {"t": telemetria_id})  # apaga as estatísticas antigas do envio
        conn.execute(text("DELETE FROM insight WHERE telemetria_id = :t"), {"t": telemetria_id})  # apaga as frases antigas do envio
        conn.execute(text("""
            DELETE FROM contrato_servico WHERE contrato_id IN
                (SELECT ct.id FROM contrato ct JOIN cliente c ON c.id = ct.cliente_id WHERE c.telemetria_id = :t)
        """), {"t": telemetria_id})                                                 # apaga os serviços dos contratos do envio
        conn.execute(text("DELETE FROM contrato WHERE cliente_id IN (SELECT id FROM cliente WHERE telemetria_id = :t)"),  # apaga os contratos do envio
                     {"t": telemetria_id})                                          # (continuação)
        conn.execute(text("DELETE FROM cliente WHERE telemetria_id = :t"), {"t": telemetria_id})  # apaga os clientes do envio

        consultores: dict[str, int] = {}                                            # cache: nome do consultor -> id
        servicos: dict[str, int] = {}                                               # cache: nome do serviço -> id

        def id_de(tabela: str, nome: str, cache: dict[str, int]) -> int:            # id_de: acha ou cria um consultor/serviço e devolve o id
            if nome not in cache:                                                   # se ainda não está no cache
                conn.execute(text(f"INSERT INTO {tabela} (nome) VALUES (:n) ON CONFLICT (nome) DO NOTHING"), {"n": nome})  # insere (ignora se já existe)
                cache[nome] = conn.execute(text(f"SELECT id FROM {tabela} WHERE nome = :n"), {"n": nome}).scalar_one()  # busca o id e guarda no cache
            return cache[nome]                                                      # devolve o id

        for r in tratado.itertuples(index=False):                                   # para cada cliente tratado
            cliente_id = conn.execute(text("""
                INSERT INTO cliente (telemetria_id, codigo, nome, consultor_id, segmento, nivel, faturamento_anual, cidade, uf)
                VALUES (:t, :codigo, :nome, :consultor, :segmento, :nivel, :fat, :cidade, :uf)
                RETURNING id
            """), {                                                                 # cada envio é a carteira completa: o cliente fica ligado ao envio
                "t": telemetria_id,                                                 # envio (tabela telemetria)
                "codigo": r.codigo_cliente[:50], "nome": r.nome_cliente[:200],      # código e nome (cortados no tamanho da coluna)
                "consultor": id_de("consultor", r.consultor[:150], consultores),    # consultor vira id
                "segmento": r.segmento[:80], "nivel": r.nivel_cliente, "fat": round(float(r.faturamento_anual), 2),  # segmento, nível e faturamento com 2 casas
                "cidade": r.cidade[:100] if isinstance(r.cidade, str) else None,    # cidade (ou nulo)
                "uf": r.uf if isinstance(r.uf, str) else None,                      # UF (ou nula)
            }).scalar_one()                                                         # fim do INSERT; devolve o id do cliente

            contrato_id = conn.execute(text("INSERT INTO contrato (cliente_id, data_inicio) VALUES (:c, :d) RETURNING id"),  # um contrato por cliente
                                       {"c": cliente_id, "d": r.data_contratacao.date()}).scalar_one()  # com a data da contratação
            for nome_servico in r.servicos:                                         # para cada serviço do cliente
                conn.execute(text("INSERT INTO contrato_servico (contrato_id, servico_id) VALUES (:k, :s)"),  # liga o contrato ao serviço
                             {"k": contrato_id, "s": id_de("servico", nome_servico[:100], servicos)})  # serviço vira id

        agora = agora_utc()                                                         # mesma data e hora para estatística e frases
        conn.execute(text("INSERT INTO estatistica (telemetria_id, gerado_em, resultado) VALUES (:t, :g, CAST(:r AS JSONB))"),  # grava o JSON com média, mediana e gráficos
                     {"t": telemetria_id, "g": agora, "r": json.dumps(payload, ensure_ascii=False)})  # o JSON vai como texto e vira JSONB
        for frase in payload.get("insights", []):                                   # para cada frase gerada pelo insights.py
            conn.execute(text("INSERT INTO insight (telemetria_id, descricao, data_geracao, tipo) VALUES (:t, :d, :g, 'GERAL')"),  # uma linha por frase
                         {"t": telemetria_id, "d": frase, "g": agora})              # frase geral: sem cliente

        mensagem = f"ETL concluído: {len(tratado)} clientes tratados"               # monta a mensagem final
        if rejeitadas_etl:                                                          # se o ETL recusou alguma linha
            mensagem += f", {rejeitadas_etl} linhas recusadas na limpeza"           # acrescenta quantas
        conn.execute(text("UPDATE telemetria SET status = 'NORMALIZADO', mensagem = :m WHERE id = :id"),  # marca o envio como NORMALIZADO
                     {"id": telemetria_id, "m": mensagem + "."})                    # com a mensagem de resumo
    log.info("Envio %s gravado: %s clientes, %s consultores, %s serviços",          # escreve no terminal o resumo
             telemetria_id, len(tratado), len(consultores), len(servicos))          # (continuação) contagens
