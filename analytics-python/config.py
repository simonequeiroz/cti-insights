"""Configuração de conexão com o banco. Lê as variáveis do arquivo .env (pasta analytics-python)."""
import os                                                      # import: os = lê variáveis de ambiente
from pathlib import Path                                       # import: Path = trabalha com caminhos de arquivos

from dotenv import load_dotenv                                 # import: load_dotenv lê o arquivo .env
from sqlalchemy.engine import URL, make_url                    # import: URL monta o endereço do banco; make_url lê um endereço pronto

load_dotenv(Path(__file__).resolve().parent / ".env")   # lê o arquivo .env que está na pasta analytics-python


def database_url() -> URL:                                     # função: devolve o endereço de conexão com o banco
    """Duas formas de configurar (a primeira que existir vale):

    1. DATABASE_URL: a string pronta do Neon/Render (postgresql://usuario:senha@host/banco?sslmode=require)
    2. DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD e DB_SSLMODE separados
    """
    pronta = os.getenv("DATABASE_URL", "").strip().strip('"')  # string pronta (aspas do .env do Neon são removidas)
    if pronta:                                                 # veio a string pronta?
        url = make_url(pronta)                                 # transforma o texto em URL
        return url.set(drivername="postgresql+psycopg")        # troca "postgresql" por "postgresql+psycopg" (o driver que instalamos)
    return URL.create(                                         # senão, monta o endereço com as variáveis separadas
        "postgresql+psycopg",                                  # driver: psycopg (conversa com o PostgreSQL)
        username=os.getenv("DB_USER", "cti"),                  # usuário (do .env)
        password=os.getenv("DB_PASSWORD", "cti123"),           # senha (do .env)
        host=os.getenv("DB_HOST", "localhost"),                # servidor (no Neon termina com .neon.tech)
        port=int(os.getenv("DB_PORT", "5432")),                # porta padrão do PostgreSQL
        database=os.getenv("DB_NAME", "ctiinsights"),          # nome do banco
        query={"sslmode": os.getenv("DB_SSLMODE", "prefer")},  # sslmode=require: conexão criptografada (o Neon exige)
    )                                                          # fecha o bloco
