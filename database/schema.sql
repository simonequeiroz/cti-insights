-- V1 — modelo compartilhado por Spring Boot e FastAPI.
BEGIN;

CREATE TABLE usuario (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    senha_hash VARCHAR(60) NOT NULL,
    papel TEXT NOT NULL CHECK (papel IN ('CONSULTOR', 'GESTOR', 'ADMINISTRADOR')),
    papel_solicitado TEXT NOT NULL CHECK (papel_solicitado IN ('CONSULTOR', 'GESTOR', 'ADMINISTRADOR')),
    status TEXT NOT NULL CHECK (status IN ('PENDENTE', 'APROVADO', 'REJEITADO')),
    criado_em TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    avaliado_em TIMESTAMP,
    avaliado_por_id BIGINT REFERENCES usuario (id)
);

CREATE TABLE consultor (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL UNIQUE,
    email VARCHAR(150) UNIQUE
);

CREATE TABLE servico (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    categoria TEXT
);

CREATE TABLE telemetria (
    id BIGSERIAL PRIMARY KEY,
    tipo_operacao TEXT NOT NULL,
    data_hora TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    status TEXT NOT NULL CHECK (status IN ('PROCESSANDO', 'NORMALIZADO', 'ERRO_SCHEMA', 'ERRO_ETL')),
    mensagem TEXT NOT NULL DEFAULT '',
    nome_arquivo TEXT NOT NULL,
    linhas_lidas INTEGER CHECK (linhas_lidas >= 0),
    usuario_id BIGINT REFERENCES usuario (id)
);

CREATE INDEX telemetria_carteira_idx ON telemetria (id DESC) WHERE status = 'NORMALIZADO';

CREATE TABLE cliente (
    id BIGSERIAL PRIMARY KEY,
    telemetria_id BIGINT NOT NULL REFERENCES telemetria (id),
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(200) NOT NULL,
    segmento VARCHAR(80) NOT NULL,
    nivel CHAR(1) NOT NULL CHECK (nivel IN ('A', 'B', 'C')),
    faturamento_anual NUMERIC(15,2) NOT NULL CHECK (faturamento_anual >= 0),
    faixa_faturamento_anual VARCHAR(50),
    cidade VARCHAR(100),
    uf CHAR(2) CHECK (uf ~ '^[A-Z]{2}$'),
    consultor_id BIGINT REFERENCES consultor (id),
    UNIQUE (telemetria_id, codigo)
);

CREATE TABLE contrato (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL UNIQUE REFERENCES cliente (id),
    data_inicio DATE NOT NULL,
    data_fim DATE,
    status TEXT,
    valor NUMERIC(15,2)
);

CREATE TABLE contrato_servico (
    contrato_id BIGINT REFERENCES contrato (id),
    servico_id BIGINT REFERENCES servico (id),
    PRIMARY KEY (contrato_id, servico_id)
);

CREATE TABLE insight (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT,
    telemetria_id BIGINT NOT NULL REFERENCES telemetria (id),
    titulo TEXT,
    descricao TEXT NOT NULL,
    data_geracao TIMESTAMP NOT NULL,
    tipo TEXT,
    prioridade TEXT,
    FOREIGN KEY (cliente_id) REFERENCES cliente (id)
);

CREATE INDEX insight_telemetria_idx ON insight (telemetria_id, id);

CREATE TABLE estatistica (
    id BIGSERIAL PRIMARY KEY,
    telemetria_id BIGINT NOT NULL UNIQUE REFERENCES telemetria (id),
    gerado_em TIMESTAMP NOT NULL,
    resultado JSONB NOT NULL
);

COMMIT;
