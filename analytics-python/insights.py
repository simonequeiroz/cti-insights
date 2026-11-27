"""Insights: transforma os números da análise em frases em português."""
from __future__ import annotations                                                  # recurso do Python para tipos mais flexíveis


def brl(valor) -> str:                                                              # brl: formata como dinheiro brasileiro
    if valor is None:                                                               # sem valor
        return "—"                                                                  # devolve um traço
    s = f"{valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")       # troca vírgula e ponto: 1,234.50 vira 1.234,50
    return f"R$ {s}"                                                                # devolve com "R$"


def _virg(x) -> str:                                                                # _virg: troca o ponto decimal por vírgula
    return str(x).replace(".", ",")                                                 # 25.0 vira "25,0"


def _clientes(n) -> str:                                                            # _clientes: "1 cliente" ou "2 clientes"
    return f"{n} cliente" if n == 1 else f"{n} clientes"                            # singular só para 1


def _juntar(nomes: list[str]) -> str:                                               # _juntar: ["A", "B", "C"] vira "A, B e C"
    return nomes[0] if len(nomes) == 1 else ", ".join(nomes[:-1]) + " e " + nomes[-1]  # um nome sozinho fica igual


def _empatados(lista: list[dict], campo: str) -> list[dict]:                        # _empatados: todos os itens com o maior valor do campo
    maior = max(x[campo] for x in lista)                                            # o maior valor
    return [x for x in lista if x[campo] == maior]                                  # todos que têm esse valor (empate = mais de um)


def _p(p) -> str:                                                                   # _p: valor-p para a frase ("p = 0,048" ou "p < 0,001")
    return "p < 0,001" if p < 0.001 else f"p = {_virg(f'{p:.3f}')}"                 # p muito pequeno vira "< 0,001"


def gerar_insights(resumo, por_segmento, por_nivel, por_consultor, por_servico, por_mes, correlacao) -> list[str]:  # gerar_insights: monta frases em português com os achados
    ins: list[str] = []                                                             # lista de frases
    segs = _empatados(por_segmento, "clientes")                                     # segmento(s) com mais clientes (pode haver empate)
    top = segs[0]                                                                   # o primeiro deles (os números são iguais em caso de empate)
    if len(segs) == 1:                                                              # um segmento só na frente
        ins.append(f"{top['segmento']} é o segmento com mais clientes: {_clientes(top['clientes'])} ({_virg(top['percentual'])}%).")  # frase do segmento
    else:                                                                           # empate
        ins.append(f"{_juntar([s['segmento'] for s in segs])} empatam como segmentos com mais clientes: "  # frase do empate
                   f"{_clientes(top['clientes'])} cada ({_virg(top['percentual'])}%).")  # (continuação)

    if resumo["media"] and resumo["mediana"] and resumo["media"] > resumo["mediana"] * 1.1:  # média bem maior que a mediana?
        ins.append(f"A média de faturamento ({brl(resumo['media'])}) é maior que a mediana ({brl(resumo['mediana'])}): "  # frase explicando
                   "poucos clientes muito grandes puxam a média para cima, então a mediana descreve melhor o cliente típico.")  # (continuação) poucos clientes grandes puxam a média
    elif resumo["media"] and resumo["mediana"]:                                     # senão, se são parecidas
        ins.append(f"Média ({brl(resumo['media'])}) e mediana ({brl(resumo['mediana'])}) são próximas: a carteira é equilibrada.")  # frase de equilíbrio

    a = next((n for n in por_nivel if n["nivel"] == "A"), None)                     # procura o nível A
    if a:                                                                           # se existe
        sujeito = "O único cliente nível A representa" if a["clientes"] == 1 else f"Os {a['clientes']} clientes nível A representam"  # singular ou plural
        apenas = "apenas " if a["percentual"] < a["percentualFaturamento"] else ""  # "apenas" só quando são poucos clientes para muito faturamento
        ins.append(f"{sujeito} {_virg(a['percentualFaturamento'])}% do faturamento total, "  # frase do nível A
                   f"com {apenas}{_virg(a['percentual'])}% dos clientes.")          # (continuação)

    cons = _empatados(por_consultor, "faturamentoTotal")                            # consultor(es) com maior faturamento (pode haver empate)
    maior = cons[0]                                                                 # o primeiro deles
    if len(cons) == 1:                                                              # frase neutra: não supõe o gênero pelo nome
        ins.append(f"{maior['consultor']} tem o maior faturamento sob gestão: {brl(maior['faturamentoTotal'])} em {_clientes(maior['clientes'])}.")  # frase do consultor
    else:                                                                           # empate
        ins.append(f"{_juntar([c['consultor'] for c in cons])} empatam no maior faturamento sob gestão: {brl(maior['faturamentoTotal'])} cada.")  # frase do empate

    if por_servico:                                                                 # se há serviços
        servs = _empatados(por_servico, "contratos")                                # serviço(s) mais contratado(s) (pode haver empate)
        s = servs[0]                                                                # o primeiro deles
        if len(servs) == 1:                                                         # um serviço só na frente
            ins.append(f"{s['servico']} é o serviço mais contratado: presente em {_clientes(s['contratos'])} ({_virg(s['percentual'])}%).")  # frase do serviço
        else:                                                                       # empate
            ins.append(f"{_juntar([x['servico'] for x in servs])} empatam como serviço mais contratado: "  # frase do empate
                       f"presentes em {_clientes(s['contratos'])} cada ({_virg(s['percentual'])}%).")  # (continuação)

    if por_mes:                                                                     # se há meses
        pico = max(e["clientes"] for e in por_mes)                                  # maior número de contratações em um mês
        meses = [f"{e['mes'][5:]}/{e['mes'][:4]}" for e in por_mes if e["clientes"] == pico]  # meses em que isso aconteceu
        if len(meses) <= 3:                                                         # poucos meses de pico
            ins.append(f"O pico de contratações foi em {', '.join(meses)} ({pico} por mês).")  # frase com os meses
        else:                                                                       # muitos meses de pico
            ins.append(f"As contratações ficaram distribuídas ao longo do tempo: no máximo {pico} por mês, repetido em {len(meses)} meses.")  # frase de distribuição

    if correlacao["pearson"] is not None:                                           # se a correlação foi calculada
        p = f"; {_p(correlacao['p'])}" if correlacao["p"] is not None else ""      # valor-p, quando existe
        ins.append(correlacao["interpretacao"].rstrip(".") + f" (r de Pearson = {_virg(correlacao['pearson'])}{p}).")  # frase da correlação
    return ins                                                                      # devolve as frases
