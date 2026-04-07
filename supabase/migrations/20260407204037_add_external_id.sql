-- =============================================================================
-- Añade external_id (TEXT UNIQUE) a las entidades principales para soportar
-- importaciones idempotentes desde sistemas externos.
-- =============================================================================

ALTER TABLE misiones        ADD COLUMN external_id TEXT UNIQUE;
ALTER TABLE retos           ADD COLUMN external_id TEXT UNIQUE;
ALTER TABLE agentes         ADD COLUMN external_id TEXT UNIQUE;
ALTER TABLE proyectos       ADD COLUMN external_id TEXT UNIQUE;
ALTER TABLE innovaciones    ADD COLUMN external_id TEXT UNIQUE;
ALTER TABLE hallazgos       ADD COLUMN external_id TEXT UNIQUE;
ALTER TABLE recomendaciones ADD COLUMN external_id TEXT UNIQUE;
