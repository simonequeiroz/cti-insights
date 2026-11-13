"""Planilha de correção: um .xlsx só com as linhas recusadas, para o usuário corrigir e enviar de novo.

As colunas são as MESMAS da planilha original (aba upload_clientes), na mesma ordem,
com os valores como o usuário digitou. No fim vem a coluna "motivo_recusa" explicando
o que corrigir; ela é ignorada no reenvio (a limpeza só lê as 10 colunas conhecidas).
"""
from __future__ import annotations                                                  # recurso do Python para tipos mais flexíveis

from io import BytesIO                                                              # BytesIO: "arquivo" na memória (não grava no disco)

from openpyxl import Workbook                                                       # Workbook: cria um arquivo Excel
from openpyxl.styles import Alignment, Font, PatternFill                            # estilos: negrito, cor de fundo, quebra de linha

from limpeza import COLUNAS                                                         # as 10 colunas da planilha, na ordem certa

ABA = "upload_clientes"                                                             # mesmo nome da aba da planilha original
COLUNA_MOTIVO = "motivo_recusa"                                                     # coluna extra com o motivo


def gerar_xlsx(rejeitadas: list[dict]) -> bytes:                                    # gerar_xlsx: lista de recusadas -> bytes do .xlsx
    """Cada item: {"linha": 37, "codigo_cliente": "...", ..., "motivo": "..."}."""
    wb = Workbook()                                                                 # novo arquivo Excel
    ws = wb.active                                                                  # primeira aba
    ws.title = ABA                                                                  # nome da aba

    cabecalho = COLUNAS + [COLUNA_MOTIVO, "linha_original"]                         # colunas da planilha + motivo + linha onde estava
    ws.append(cabecalho)                                                            # escreve o cabeçalho
    for celula in ws[1]:                                                            # deixa o cabeçalho em negrito
        celula.font = Font(bold=True)
    vermelho = PatternFill("solid", fgColor="FDE2E1")                               # fundo vermelho claro para o motivo
    ws.cell(row=1, column=len(COLUNAS) + 1).fill = vermelho                         # destaca o título da coluna de motivo

    for r in rejeitadas:                                                            # uma linha por recusada
        valores = [r.get(c) for c in COLUNAS] + [r.get("motivo"), r.get("linha")]   # valores na ordem do cabeçalho
        ws.append(valores)                                                          # escreve a linha
        motivo = ws.cell(row=ws.max_row, column=len(COLUNAS) + 1)                   # célula do motivo
        motivo.fill = vermelho                                                      # destaca
        motivo.alignment = Alignment(wrap_text=True, vertical="top")                # quebra o texto longo

    larguras = {"nome_cliente": 30, "servicos_contratados": 32, COLUNA_MOTIVO: 50}  # colunas que precisam de mais espaço
    for i, nome in enumerate(cabecalho, start=1):                                   # ajusta a largura de cada coluna
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = larguras.get(nome, 18)
    ws.freeze_panes = "A2"                                                          # o cabeçalho fica fixo ao rolar

    arquivo = BytesIO()                                                             # arquivo na memória
    wb.save(arquivo)                                                                # salva o Excel nele
    return arquivo.getvalue()                                                       # devolve os bytes
