"""Upsell: encontra clientes com oportunidade de contratar mais serviços.

Mesmas regras do front (frontend-vue/src/utils/upsell.js), agora calculadas no Python:
1. Faturamento acima da mediana do segmento, com menos serviços que a média do segmento.
2. Serviço que 60% ou mais do segmento tem e o cliente não tem.
3. Segmento com muitos serviços contratados e pouca participação no faturamento.
"""
from __future__ import annotations                                                  # recurso do Python para tipos mais flexíveis

import pandas as pd                                                                 # pandas: tabelas de dados

MINIMO_CLIENTES_SEGMENTO = 3                                                        # com menos clientes, a comparação dentro do segmento não diz nada
ADOCAO_MINIMA = 0.6                                                                 # serviço "comum no segmento": 60% dos clientes dele têm
FOLGA_MINIMA_SERVICOS = 0.25                                                        # quanto abaixo da média de serviços conta como "poucos serviços"
DIFERENCA_MINIMA_PONTOS = 5                                                         # diferença mínima, em pontos percentuais, para destacar um segmento


def _decimal_br(valor: float) -> str:                                               # _decimal_br: 2.5 vira "2,5" e 2.0 vira "2"
    return f"{valor:.1f}".rstrip("0").rstrip(".").replace(".", ",")                 # uma casa decimal, sem zero sobrando, com vírgula


def _resumir_segmento(g: pd.DataFrame) -> dict:                                     # _resumir_segmento: referências de um segmento
    total = len(g)                                                                  # quantidade de clientes do segmento
    contagem: dict[str, int] = {}                                                   # serviço -> quantos clientes do segmento têm
    for lista in g["servicos"]:                                                     # para a lista de serviços de cada cliente
        for servico in lista:                                                       # para cada serviço da lista
            contagem[servico] = contagem.get(servico, 0) + 1                        # soma 1 para o serviço
    adocao = sorted(({"servico": s, "proporcao": n / total} for s, n in contagem.items()),  # proporção de clientes com cada serviço
                    key=lambda x: -x["proporcao"])                                  # do mais comum para o menos comum
    return {                                                                        # devolve as referências do segmento
        "medianaFaturamento": float(g["faturamento_anual"].median()),               # mediana do faturamento do segmento
        "mediaServicos": float(g["qtd_servicos"].mean()),                           # média de serviços por cliente do segmento
        "adocao": adocao,                                                           # serviços e proporção de adoção
    }                                                                               # fim do dicionário


def _motivos(cliente, resumo: dict | None) -> list[str]:                            # _motivos: por que o cliente é uma oportunidade
    if resumo is None:                                                              # segmento pequeno demais para comparar
        return []                                                                   # sem motivos
    motivos: list[str] = []                                                         # lista de motivos
    qtd = len(cliente.servicos)                                                     # quantos serviços o cliente tem
    if cliente.faturamento_anual > resumo["medianaFaturamento"] and resumo["mediaServicos"] - qtd >= FOLGA_MINIMA_SERVICOS:  # fatura bem e tem poucos serviços?
        motivos.append(f"Faturamento acima da mediana do segmento, com poucos serviços "  # regra 1
                       f"({qtd} contra média de {_decimal_br(resumo['mediaServicos'])})")  # (continuação) quantidade e média
    faltante = next((a for a in resumo["adocao"]                                    # primeiro serviço comum no segmento...
                     if a["proporcao"] >= ADOCAO_MINIMA and a["servico"] not in cliente.servicos), None)  # ...que o cliente não tem
    if faltante:                                                                    # se encontrou
        motivos.append(f"{int(faltante['proporcao'] * 100 + 0.5)}% do segmento {cliente.segmento} "  # regra 2
                       f"tem {faltante['servico']}; este cliente não tem")          # (continuação) o serviço que falta
    return motivos                                                                  # devolve os motivos


def _segmento_potencial(df: pd.DataFrame) -> dict | None:                           # _segmento_potencial: regra 3 (muitos serviços, pouco faturamento)
    total_servicos = int(df["qtd_servicos"].sum())                                  # total de serviços contratados
    total_fat = float(df["faturamento_anual"].sum())                                # faturamento total
    if not total_servicos or not total_fat:                                         # sem serviços ou sem faturamento
        return None                                                                 # não dá para comparar
    candidatos = []                                                                 # um candidato por segmento
    for segmento, g in df.groupby("segmento", sort=False):                          # para cada segmento
        p_serv = g["qtd_servicos"].sum() / total_servicos * 100                     # % dos serviços contratados
        p_fat = g["faturamento_anual"].sum() / total_fat * 100                      # % do faturamento
        candidatos.append({"segmento": str(segmento), "participacaoServicos": round(float(p_serv), 1),  # guarda as participações
                           "participacaoFaturamento": round(float(p_fat), 1), "diferenca": round(float(p_serv - p_fat), 1)})  # e a diferença
    melhor = max(candidatos, key=lambda c: c["diferenca"])                          # o segmento com a maior diferença
    return melhor if melhor["diferenca"] >= DIFERENCA_MINIMA_PONTOS else None       # só destaca se a diferença for relevante


def analisar_upsell(df: pd.DataFrame) -> dict:                                      # analisar_upsell: função principal
    """Recebe a tabela tratada (limpeza.py) e devolve as oportunidades e o segmento com potencial."""
    resumos = {segmento: _resumir_segmento(g)                                       # referências de cada segmento...
               for segmento, g in df.groupby("segmento", sort=False)                # ...agrupando por segmento...
               if len(g) >= MINIMO_CLIENTES_SEGMENTO}                               # ...só os que têm clientes suficientes
    oportunidades = []                                                              # lista de clientes com oportunidade
    for c in df.itertuples(index=False):                                            # para cada cliente
        motivos = _motivos(c, resumos.get(c.segmento))                              # motivos do cliente
        if motivos:                                                                 # tem oportunidade?
            oportunidades.append({                                                  # guarda os dados para a tela
                "codigo": c.codigo_cliente, "nome": c.nome_cliente, "segmento": c.segmento,  # código, nome e segmento
                "nivel": c.nivel_cliente, "consultor": c.consultor,                 # nível e consultor
                "faturamento": round(float(c.faturamento_anual), 2), "servicos": list(c.servicos),  # faturamento e serviços
                "motivos": motivos,                                                 # por que é uma oportunidade
            })                                                                      # fim do dicionário
    oportunidades.sort(key=lambda o: -o["faturamento"])                             # maior faturamento primeiro
    return {"oportunidades": oportunidades, "segmentoPotencial": _segmento_potencial(df)}  # devolve o resultado
