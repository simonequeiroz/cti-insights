-- V2 — senha temporária gerada pelo administrador.
-- Aplicar em bancos que já têm a V1 (schema.sql). Bancos novos já recebem a
-- coluna pelo schema.sql. Pode rodar mais de uma vez sem erro.
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS trocar_senha BOOLEAN NOT NULL DEFAULT FALSE;
