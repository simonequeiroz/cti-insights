# Teste da hipótese H01 (Sprint 1): o ETL padroniza grafias inconsistentes.
# Gera 100 registros fictícios com erros propositais e envia para a rota
# /testar do Python, que calcula tudo SEM gravar no banco.
#
# Como rodar (com a API ligada: uvicorn api:app --port 8000):
#   python teste_h01.py
import collections
import json
import random
import time
import urllib.request

URL = "http://localhost:8000/testar"
random.seed(42)  # mesma planilha a cada execução

# grafia na planilha -> segmento esperado (None = erro de digitação fora do dicionário)
VARIANTES = {
    "IND.": "Indústria", "Ind.": "Indústria", "industria": "Indústria", "INDÚSTRIA": "Indústria", " Indústria ": "Indústria",
    "Comercio": "Comércio", "COM": "Comércio", "comércio": "Comércio",
    "serv.": "Serviços", "SERVICOS": "Serviços", "Servico": "Serviços",
    "TI": "Tecnologia", "tec": "Tecnologia", "saude": "Saúde", "EDU": "Educação",
    "INDISTIRA": None,  # erro citado na Sprint 1
}
CONSULTORES = ["ana souza", "ANA SOUZA", "Carlos Lima", "carlos  lima", "beatriz reis"]


def gerar_linhas():
    chaves = list(VARIANTES)
    linhas = []
    for i in range(100):
        faturamento = random.randint(50, 3000) * 1000
        texto_reais = f"R$ {faturamento:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        linhas.append({
            "codigoCliente": f"H01-{i:03d}",
            "nomeCliente": f"Empresa {i}",
            "consultor": random.choice(CONSULTORES),
            "segmento": chaves[i % len(chaves)],
            "nivelCliente": random.choice("ABC"),
            "faturamentoAnual": texto_reais if i % 3 == 0 else faturamento,
            "servicosContratados": random.choice(["firewall;BACKUP", "Internet Dedicada", "cloud;mpls"]),
            "dataContratacao": f"{random.randint(1, 28):02d}/{random.randint(1, 12):02d}/2025" if i % 2 else "2025-03-15",
            "cidade": "Campinas",
            "uf": "SP",
        })
    return linhas


def main():
    linhas = gerar_linhas()
    esperado = collections.Counter(VARIANTES[linha["segmento"]] for linha in linhas)
    esperado.pop(None, None)

    pedido = urllib.request.Request(URL, data=json.dumps(linhas).encode("utf-8"),
                                    headers={"Content-Type": "application/json"}, method="POST")
    inicio = time.perf_counter()
    with urllib.request.urlopen(pedido, timeout=60) as resposta:
        resultado = json.load(resposta)
    tempo = time.perf_counter() - inicio

    obtido = {item["segmento"]: item["clientes"] for item in resultado["porSegmento"]}
    qualidade = resultado["qualidade"]
    consultores = [item["consultor"] for item in resultado["porConsultor"]]

    print(f"Recebidos: {qualidade['linhasRecebidas']} | aceitos: {qualidade['linhasValidas']} | descartados: {qualidade['linhasInvalidas']}")
    print(f"Segmentos esperados: {dict(esperado)}")
    print(f"Segmentos obtidos:   {obtido}")
    print(f"Consultores: {len(set(CONSULTORES))} grafias -> {consultores}")
    print(f"Tempo de processamento: {tempo:.2f} s")

    passou = obtido == dict(esperado) and len(consultores) == 3
    print("H01 CONFIRMADA" if passou else "H01 NÃO CONFIRMADA")
    raise SystemExit(0 if passou else 1)


if __name__ == "__main__":
    main()
