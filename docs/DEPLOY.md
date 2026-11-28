# Deploy do CTI Insights

Como o sistema foi publicado: **front na Vercel**, **Java e Python no Render**
e **banco no Neon**. Segue o guia de deploy da disciplina (Render + Vercel),
com os ajustes que o nosso projeto exige (tabela no fim).

```
Navegador ──► Vercel (Vue)
                 │  /api/...  (a Vercel repassa para o Java)
                 ▼
              Render: Java (Spring Boot) ──► Render: Python (ETL) ──► Neon
                 └─────────────────────────────────────────────────► Neon
```

**Por que a Vercel repassa o `/api`:** o login usa cookie de sessão. Se o
site chamasse o Java direto em outro domínio (`onrender.com`), o navegador
bloquearia o cookie e o login não funcionaria. Com o repasse, o navegador só
conversa com a Vercel.

**Nenhuma senha vai para o GitHub.** Os valores dos `.env` são digitados nas
telas de variáveis de cada serviço.

## Ordem

1. Python no Render → testar `/saude`
2. Java no Render → testar `/api/health`
3. Conferir o endereço do Java no `frontend-vue/vercel.json`
4. Front na Vercel
5. Colocar o endereço da Vercel no CORS do Java
6. Testar tudo

## 1. Python no Render

[dashboard.render.com](https://dashboard.render.com) → **+ New** → **Web Service** → repositório `cti-insights`.

| Campo | Valor |
|---|---|
| Name | `cti-insights-python` |
| Language · Branch | Python 3 · `main` |
| Region | Virginia (US East), a mesma para os dois serviços |
| Root Directory | `analytics-python` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn api:app --host 0.0.0.0 --port $PORT` |
| Instance Type | Free |

**Variáveis de ambiente** (Neon → projeto `cti-insights` → **Connect**):

| Variável | Valor |
|---|---|
| `DB_HOST` | o endereço depois do `@` (termina em `.neon.tech`) |
| `DB_PORT` | `5432` |
| `DB_NAME` | `neondb` |
| `DB_USER` | o usuário antes dos `:` |
| `DB_PASSWORD` | Connect → Show password |
| `DB_SSLMODE` | `require` |
| `ETL_API_KEY` | uma chave nova de 40 caracteres (comando abaixo); a mesma vai no Java |
| `PYTHON_VERSION` | `3.12.7` |

Para gerar a chave sem que ela apareça na tela (PowerShell; ela vai para o
Ctrl + V):

```powershell
$b = New-Object byte[] 20; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); -join ($b | % { $_.ToString('x2') }) | Set-Clipboard
```

**Teste:** `https://cti-insights-python.onrender.com/saude` → `{"status":"ok"}`.
Anote o endereço exato que o Render mostrar no topo da página do serviço.

## 2. Java no Render

**+ New** → **Web Service** → mesmo repositório.

| Campo | Valor |
|---|---|
| Name | `cti-insights-api` |
| Language · Branch | **Docker** · `main` |
| Region | a mesma do Python |
| Root Directory | `backend-java` |
| Dockerfile Path | deixe o padrão (`./Dockerfile`) |
| Instance Type | Free |

**Variáveis de ambiente:**

| Variável | Valor |
|---|---|
| `DB_URL` | `jdbc:postgresql://HOST/neondb?sslmode=require` (HOST com `-pooler`, igual ao `backend-java/.env`) |
| `DB_USER` · `DB_PASSWORD` | os mesmos do Python |
| `ETL_URL` | endereço do Python, **sem `/etl` e sem `/` no fim**. Ex.: `https://cti-insights-python.onrender.com` |
| `ETL_API_KEY` | a **mesma** do Python |
| `ETL_READ_TIMEOUT` | `120s` (o Python pode estar acordando) |
| `ADMIN_NAME` · `ADMIN_EMAIL` · `ADMIN_PASSWORD` | **opcionais**: só criam o administrador se o banco ainda não tiver um. No Neon do projeto ele já existe; deixe de fora |
| `CORS_ALLOWED_ORIGINS` | deixe para o passo 5 |

O primeiro deploy leva de 5 a 8 minutos.

**Teste:** `https://cti-insights-api.onrender.com/api/health` → `{"status":"ok"}`.

## 3. Conferir o `vercel.json`

O arquivo `frontend-vue/vercel.json` repassa `/api` para
`https://cti-insights-api.onrender.com`. Se o Render deu outro endereço ao
Java (acontece quando o nome já existe), troque no arquivo, faça commit e
push **antes** do passo 4.

## 4. Front na Vercel

[vercel.com](https://vercel.com) → entrar com o GitHub → **Add New** → **Project** → importar `cti-insights`.

| Campo | Valor |
|---|---|
| Project Name | `cti-insights` |
| Framework Preset | Vite |
| Root Directory | `frontend-vue` |
| Build · Output | `npm run build` · `dist` (já vem) |

**Variáveis de ambiente:**

| Variável | Valor |
|---|---|
| `VITE_USE_MOCK` | `false` (sem isso o site abre em modo demonstração) |
| `VITE_API_URL` | `/api` |

**Deploy** → anote o endereço `https://….vercel.app`.

## 5. CORS no Java

Render → `cti-insights-api` → **Environment** → adicionar:

```
CORS_ALLOWED_ORIGINS=https://SEU-SITE.vercel.app
```

Sem `/` no fim. Para aceitar também o ambiente local, separe por vírgula:
`https://SEU-SITE.vercel.app,http://localhost:5173`. Salvar reinicia o Java.

## 6. Testar, nesta ordem

| # | Abrir | Esperado |
|---|---|---|
| 1 | `…python…onrender.com/saude` | `{"status":"ok"}` |
| 2 | `…api…onrender.com/api/health` | `{"status":"ok"}` |
| 3 | site na Vercel | tela inicial |
| 4 | login com o administrador | entra, sem erro no F12 → Console |
| 5 | Importar → `dados.xlsx` | importação concluída, 32 clientes |
| 6 | Dashboard → F5 | continua na tela, com gráficos e insights |

## Diferenças em relação ao guia da disciplina

| No guia | No CTI Insights | Por quê |
|---|---|---|
| `frontend/`, `backend/` | `frontend-vue/`, `backend-java/` | nomes das pastas do projeto |
| `VITE_API_URL` = endereço do Java | `VITE_API_URL=/api` + repasse no `vercel.json` | login por cookie de sessão, não por token |
| — | `VITE_USE_MOCK=false` | o front tem modo demonstração |
| `ETL_URL` = Python + `/etl` | `ETL_URL` = só o endereço do Python | o Java já acrescenta `/etl` |
| `ETL_KEY` | `ETL_API_KEY` | nome usado no código |
| `CORS_ORIGINS` | `CORS_ALLOWED_ORIGINS` | nome usado no código |
| `JWT_SECRET` | não existe | login por sessão (ver `docs/RELATORIO-FINAL.md`) |

## Cuidados

- **Serviço dormindo:** no plano gratuito, Java e Python dormem após 15 min
  sem uso e levam cerca de 1 minuto para acordar. Antes de apresentar, abra
  os dois testes (`/saude` e `/api/health`) e faça login uns 5 minutos antes.
- **Mesmo banco do ambiente local:** importar uma planilha no site publicado
  troca a carteira que aparece na máquina de todos, e vice-versa.
- **Não troque a senha do banco no Neon:** isso derruba o deploy e os `.env`
  de toda a equipe ao mesmo tempo.
- O `Dockerfile` limita a memória do Java para caber nos 512 MB do plano
  gratuito, e o `application.properties` lê a porta da variável `PORT`.
