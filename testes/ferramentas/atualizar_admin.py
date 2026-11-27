# Grava no banco o e-mail e a senha do administrador que estão no
# backend-java/.env (ADMIN_EMAIL e ADMIN_PASSWORD).
#
# Para que serve: o ADMIN_* do .env só cria a conta na PRIMEIRA vez que o
# Spring inicia. Trocar o .env depois não muda a conta. Este script aplica a
# troca. Não imprime senha nem hash.
#
# Como rodar (na raiz do projeto, com o venv do analytics-python):
#   python -m pip install bcrypt
#   python testes/ferramentas/atualizar_admin.py
import sys
from pathlib import Path

import bcrypt
import psycopg

RAIZ = Path(__file__).resolve().parents[2]


def ler_env(caminho):
    valores = {}
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        if "=" in linha and not linha.lstrip().startswith("#"):
            chave, valor = linha.split("=", 1)
            # O Spring lê o .env como .properties: ignora espaços no começo do valor
            valores[chave.strip()] = valor.lstrip()
    return valores


java = ler_env(RAIZ / "backend-java" / ".env")
py = ler_env(RAIZ / "analytics-python" / ".env")
email = java.get("ADMIN_EMAIL", "").strip().lower()
senha = java.get("ADMIN_PASSWORD", "")

# Mesmas regras do Spring (UsuarioService)
if not email or len(senha) < 8 or len(senha.encode("utf-8")) > 72:
    sys.exit("ADMIN_EMAIL vazio ou ADMIN_PASSWORD fora da regra (8 caracteres a 72 bytes). Nada foi alterado.")
if "\\" in senha or senha != senha.rstrip():
    sys.exit("A senha tem barra invertida ou espaço no fim, que o Spring lê de outro jeito. Nada foi alterado.")

# Spring usa o prefixo $2a$; o bcrypt do Python gera $2b$ (mesmo algoritmo)
hash_novo = bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode().replace("$2b$", "$2a$", 1)

with psycopg.connect(host=py["DB_HOST"].strip(), port=py.get("DB_PORT", "5432").strip(), dbname=py["DB_NAME"].strip(),
                     user=py["DB_USER"].strip(), password=py["DB_PASSWORD"].strip(), sslmode="require") as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM usuario WHERE papel = 'ADMINISTRADOR' AND status = 'APROVADO' ORDER BY id")
        admins = [linha[0] for linha in cur.fetchall()]
        if len(admins) != 1:
            sys.exit("Não há exatamente um administrador aprovado. Nada foi alterado.")
        cur.execute("SELECT count(*) FROM usuario WHERE lower(email) = %s AND id <> %s", (email, admins[0]))
        if cur.fetchone()[0]:
            sys.exit("O ADMIN_EMAIL do .env já pertence a outro usuário. Nada foi alterado.")
        cur.execute("UPDATE usuario SET email = %s, senha_hash = %s, trocar_senha = FALSE WHERE id = %s",
                    (email, hash_novo, admins[0]))
        print(f"Administrador atualizado com o e-mail e a senha do .env ({cur.rowcount} conta).")
