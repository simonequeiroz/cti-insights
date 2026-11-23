"""Testa a conexão com o PostgreSQL do Neon: python testar_conexao.py"""
from sqlalchemy import text  # import: text escreve SQL

from banco import criar_engine  # import: abre a conexão (usa o .env)

try:  # tenta conectar
    with criar_engine().connect() as conexao:  # abre a conexão com o banco
        versao = conexao.execute(text("SELECT version()")).scalar()  # pergunta a versão do PostgreSQL
        print("Conectou!", versao)  # deu certo: mostra a versão
        try:  # tenta contar os envios
            envios = conexao.execute(text("SELECT COUNT(*) FROM telemetria")).scalar()  # conta quantos envios de planilha existem
            print("Envios no banco:", envios)  # mostra quantos envios já foram feitos
        except Exception:  # a tabela ainda não existe
            print("As tabelas ainda não foram criadas. Rode o database/schema.sql no banco e teste de novo.")  # explica o que fazer
except Exception as erro:  # se não conectou:
    print("Não conectou. Confira os dados do .env (host, usuário, senha e DB_SSLMODE=require).")  # dica de onde olhar
    print("Detalhe:", str(erro).splitlines()[0])  # mostra só a primeira linha do erro
