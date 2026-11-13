-- TABELAS QUE O PYTHON ESPERA (analytics-python/banco.py) — referência para a squad do BANCO.
-- NÃO é o schema oficial: quem define o banco é a squad responsável. Nomes, tipos e colunas
-- extras podem mudar; se mudarem, avise a squad de dados para ajustar banco.py.
-- Serve também para criar um banco DE TESTE local e rodar o test_analytics.py.

-- Um registro por planilha enviada (a "Telemetria" do diagrama de classes)
CREATE TABLE IF NOT EXISTS upload_lote (
    id            BIGSERIAL PRIMARY KEY,
    nome_arquivo  VARCHAR(255) NOT NULL,
    linhas_lidas  INT,
    status        VARCHAR(20)  NOT NULL DEFAULT 'AGUARDANDO_ETL',
    mensagem      VARCHAR(500),
    criado_em     TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT ck_upload_lote_status
        CHECK (status IN ('AGUARDANDO_ETL', 'PROCESSANDO', 'PROCESSADO', 'ERRO', 'REJEITADO'))
);

CREATE TABLE IF NOT EXISTS consultor (
    id    SERIAL PRIMARY KEY,
    nome  VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS servico (
    id    SERIAL PRIMARY KEY,
    nome  VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS cliente (
    id                 BIGSERIAL PRIMARY KEY,
    lote_id            BIGINT       NOT NULL REFERENCES upload_lote(id) ON DELETE CASCADE,
    codigo_cti         VARCHAR(60)  NOT NULL,
    nome               VARCHAR(255) NOT NULL,
    consultor_id       INT          NOT NULL REFERENCES consultor(id),
    segmento           VARCHAR(40)  NOT NULL,
    nivel              CHAR(1)      NOT NULL CHECK (nivel IN ('A', 'B', 'C')),
    faturamento_anual  NUMERIC(15, 2) NOT NULL CHECK (faturamento_anual >= 0),
    cidade             VARCHAR(120),
    uf                 CHAR(2),
    UNIQUE (lote_id, codigo_cti)
);

-- Um contrato por serviço contratado pelo cliente
CREATE TABLE IF NOT EXISTS contrato (
    id                BIGSERIAL PRIMARY KEY,
    cliente_id        BIGINT NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
    servico_id        INT    NOT NULL REFERENCES servico(id),
    data_contratacao  DATE   NOT NULL,
    UNIQUE (cliente_id, servico_id)
);

-- JSON com as estatísticas do lote (o dashboard lê daqui)
CREATE TABLE IF NOT EXISTS estatistica_lote (
    lote_id    BIGINT PRIMARY KEY REFERENCES upload_lote(id) ON DELETE CASCADE,
    gerado_em  TIMESTAMP NOT NULL,
    resultado  JSONB     NOT NULL
);

-- Linhas recusadas, com os valores ORIGINAIS: viram a "planilha de correção"
CREATE TABLE IF NOT EXISTS linha_rejeitada (
    id       BIGSERIAL PRIMARY KEY,
    lote_id  BIGINT NOT NULL REFERENCES upload_lote(id) ON DELETE CASCADE,
    linha    INT,
    dados    JSONB  NOT NULL,
    motivo   VARCHAR(1000) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_linha_rejeitada_lote ON linha_rejeitada (lote_id);
