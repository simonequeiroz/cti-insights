"""Testes do ETL. Rodar:  python test_analytics.py   (ou: python -m pytest -q)

- Sem banco: limpeza, cálculo e planilha de correção (sempre rodam).
- Com banco: defina TEST_DATABASE_URL apontando para um banco DE TESTE com o schema.sql
  (nunca o de produção: o teste cria e apaga lotes).
"""
import os
from io import BytesIO

import pandas as pd
from openpyxl import load_workbook

from analise import calcular
from correcao import COLUNA_MOTIVO, gerar_xlsx
from limpeza import COLUNAS, tratar


def linha(n, **campos):
    """Uma linha como o Spring manda (camelCase + numeroLinha)."""
    base = dict(numeroLinha=n, codigoCliente=f"C{n}", nomeCliente="Empresa", consultor="ana souza",
                segmento="IND.", nivelCliente="a", faturamentoAnual="1.000.000,00",
                servicosContratados="Cloud; backup", dataContratacao="10/01/2025", cidade="Campinas", uf="sp")
    base.update(campos)
    return base


def df(linhas):
    return pd.DataFrame(linhas).astype(object)


def test_padroniza():
    res = tratar(df([linha(2)]))
    l = res.tratado.iloc[0]
    assert (l.segmento, l.consultor, l.nivel_cliente, l.uf) == ("Indústria", "Ana Souza", "A", "SP")
    assert l.servicos == ["Cloud", "Backup"] and l.faturamento_anual == 1_000_000.0


def test_recusadas_guardam_originais_e_numero_da_linha():
    # o Spring manda as linhas 2, 5 e 9 (com buracos): o número tem que ser o da planilha
    res = tratar(df([linha(2), linha(5, nivelCliente="E"), linha(9, consultor=None, codigoCliente="c2")]))
    assert len(res.tratado) == 1
    rej = res.rejeitadas.to_dict("records")
    assert [r["linha"] for r in rej] == [5, 9]
    assert rej[0]["nivel_cliente"] == "E"            # valor original, como o usuário digitou
    assert rej[1]["codigo_cliente"] == "c2"          # original (sem virar maiúsculo)
    assert "duplicado" in rej[1]["motivo"] and "consultor" in rej[1]["motivo"]
    assert set(COLUNAS) <= set(res.rejeitadas.columns)


def test_calcular_e_meses_vazios():
    res = tratar(df([linha(2, faturamentoAnual=100), linha(3, faturamentoAnual=300, dataContratacao="2025-03-01")]))
    r = calcular(res, 3)
    assert r["resumo"]["media"] == 200 and r["resumo"]["faturamentoTotal"] == 400
    assert [m["clientes"] for m in r["porMes"]] == [1, 0, 1]
    assert r["qualidade"]["linhasInvalidas"] == 1


def test_planilha_de_correcao_reenviavel():
    res = tratar(df([linha(2), linha(3, nivelCliente="E")]))
    rej = res.rejeitadas.astype(object).where(res.rejeitadas.notna(), None).to_dict("records")
    wb = load_workbook(BytesIO(gerar_xlsx(rej)))
    ws = wb["upload_clientes"]
    cab = [c.value for c in ws[1]]
    assert cab[:10] == COLUNAS and cab[10] == COLUNA_MOTIVO
    assert ws.cell(row=2, column=COLUNAS.index("nivel_cliente") + 1).value == "E"
    # reenvio: o usuário corrige o nível e manda a mesma planilha; a coluna de motivo é ignorada
    ws.cell(row=2, column=COLUNAS.index("nivel_cliente") + 1).value = "B"
    reenvio = pd.DataFrame([[c.value for c in r] for r in ws.iter_rows(min_row=2)], columns=cab)
    assert len(tratar(reenvio.astype(object)).tratado) == 1


def test_api_ponta_a_ponta_com_banco():
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        print("  (pulado: defina TEST_DATABASE_URL para testar com banco)")
        return
    os.environ["DATABASE_URL"] = url
    os.environ["ETL_API_KEY"] = "teste"
    from fastapi.testclient import TestClient
    from sqlalchemy import create_engine, text
    import api
    from config import database_url

    eng = create_engine(database_url())
    with eng.begin() as c:
        lote = c.execute(text("INSERT INTO upload_lote (nome_arquivo, linhas_lidas) VALUES ('t.xlsx', 3) RETURNING id")).scalar_one()
    cli = TestClient(api.app)
    h = {"X-ETL-Key": "teste"}
    corpo = {"loteId": lote, "recebidas": 3, "linhas": [linha(2), linha(3), linha(4, nivelCliente="E")]}

    assert cli.post("/etl", json=corpo).status_code == 401                         # sem chave
    r = cli.post("/etl", json=corpo, headers=h)
    assert r.status_code == 200 and r.json()["validas"] == 2 and r.json()["rejeitadas"] == 1, r.text
    assert cli.post("/etl", json=corpo, headers=h).status_code == 409              # mesmo lote de novo
    x = cli.get(f"/lotes/{lote}/correcao.xlsx", headers=h)
    assert x.status_code == 200 and x.content[:2] == b"PK"
    with eng.connect() as c:
        st = c.execute(text("SELECT status FROM upload_lote WHERE id = :i"), {"i": lote}).scalar_one()
        n = c.execute(text("SELECT count(*) FROM cliente WHERE lote_id = :i"), {"i": lote}).scalar_one()
    assert (st, n) == ("PROCESSADO", 2)

    with eng.begin() as c:                                                          # lote só com linhas ruins
        ruim = c.execute(text("INSERT INTO upload_lote (nome_arquivo) VALUES ('r.xlsx') RETURNING id")).scalar_one()
    r = cli.post("/etl", json={"loteId": ruim, "recebidas": 1, "linhas": [linha(2, segmento="Agro")]}, headers=h)
    assert r.status_code == 422
    assert cli.get(f"/lotes/{ruim}/correcao.xlsx", headers=h).status_code == 200   # dá para baixar e corrigir
    with eng.begin() as c:
        c.execute(text("DELETE FROM upload_lote WHERE id IN (:a, :b)"), {"a": lote, "b": ruim})


if __name__ == "__main__":
    for nome, f in list(globals().items()):
        if nome.startswith("test_"):
            f()
            print("ok", nome)
