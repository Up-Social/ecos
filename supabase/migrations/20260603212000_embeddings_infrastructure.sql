-- =============================================================================
-- embeddings_infrastructure — Infraestructura vectorial de ECOS v2 (Fase 10).
--
-- Configura pgvector y crea la capa de embeddings:
--   embeddings     : vector por entidad de dominio (idempotente por content_hash).
--   embedding_jobs : cola de trabajo (pending → processing → done/error) con
--                    reintentos y backoff (run_after).
--
-- Más dos funciones de cola (SECURITY DEFINER) que usa el worker:
--   enqueue_embedding_job(entity_type, entity_id) : encola/desduplica.
--   claim_embedding_jobs(limit)                   : reclama un lote (SKIP LOCKED).
--
-- Migración ADITIVA, idempotente y NO destructiva:
--   - No modifica ni elimina tablas, columnas ni datos existentes.
--   - Las tablas nacen vacías; la infraestructura queda inerte hasta que un
--     worker (API route Next.js POST /api/embeddings) la procese.
--
-- NO incluye GraphRAG ni la automatización por triggers/cron (eso es Fase 11+).
--
-- Entidades soportadas:
--   misiones, retos, agentes, proyectos, innovaciones, hallazgos, recomendaciones
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Extensión pgvector
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;


-- -----------------------------------------------------------------------------
-- 1. embeddings — un vector por entidad (clave natural entity_type + entity_id)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS embeddings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type   TEXT NOT NULL CHECK (
        entity_type IN (
            'misiones', 'retos', 'agentes', 'proyectos',
            'innovaciones', 'hallazgos', 'recomendaciones'
        )
    ),
    entity_id     UUID NOT NULL,
    -- Hash del documento textual embebido: evita re-embeddear si el texto no cambió.
    content_hash  TEXT NOT NULL,
    -- Dimensión 1536 (placeholder del doc §6.3, compatible con OpenAI/Voyage).
    -- Cambiar de dimensión exige una migración nueva con ALTER (no editar esta).
    embedding     VECTOR(1536),
    model         TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT embeddings_entity_unique UNIQUE (entity_type, entity_id)
);

-- Índice ANN (HNSW, similitud coseno) para recuperación vectorial (Fases 12-13).
CREATE INDEX IF NOT EXISTS idx_embeddings_ann
    ON embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_embeddings_entity
    ON embeddings (entity_type, entity_id);

DROP TRIGGER IF EXISTS update_embeddings ON embeddings;
CREATE TRIGGER update_embeddings
    BEFORE UPDATE ON embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();


-- -----------------------------------------------------------------------------
-- 2. embedding_jobs — cola de generación/actualización con reintentos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS embedding_jobs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type   TEXT NOT NULL CHECK (
        entity_type IN (
            'misiones', 'retos', 'agentes', 'proyectos',
            'innovaciones', 'hallazgos', 'recomendaciones'
        )
    ),
    entity_id     UUID NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'done', 'error')),
    attempts      INT NOT NULL DEFAULT 0,
    last_error    TEXT,
    -- Momento a partir del cual el job es elegible (backoff de reintentos).
    run_after     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recorrido de la cola por estado y orden de elegibilidad.
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status
    ON embedding_jobs (status, run_after);

-- Como mucho un job ACTIVO (pending/processing) por entidad: evita pile-up.
CREATE UNIQUE INDEX IF NOT EXISTS uq_embedding_jobs_active
    ON embedding_jobs (entity_type, entity_id)
    WHERE status IN ('pending', 'processing');

DROP TRIGGER IF EXISTS update_embedding_jobs ON embedding_jobs;
CREATE TRIGGER update_embedding_jobs
    BEFORE UPDATE ON embedding_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();


-- -----------------------------------------------------------------------------
-- 3. Funciones de cola (SECURITY DEFINER → ejecutan como owner, sortean RLS).
-- -----------------------------------------------------------------------------

-- 3.1 Encolar un job para una entidad. Si ya hay uno activo (pending/processing)
--     para esa entidad, lo "reactiva" (run_after = now()) en lugar de duplicar.
CREATE OR REPLACE FUNCTION public.enqueue_embedding_job(
    p_entity_type TEXT,
    p_entity_id   UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO embedding_jobs (entity_type, entity_id, status, run_after, attempts, last_error)
    VALUES (p_entity_type, p_entity_id, 'pending', now(), 0, NULL)
    ON CONFLICT (entity_type, entity_id) WHERE status IN ('pending', 'processing')
    DO UPDATE SET run_after = now(), updated_at = now()
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

-- 3.2 Reclamar un lote de jobs elegibles: los marca 'processing', incrementa
--     attempts y los devuelve. FOR UPDATE SKIP LOCKED → seguro ante concurrencia.
CREATE OR REPLACE FUNCTION public.claim_embedding_jobs(p_limit INT DEFAULT 10)
RETURNS SETOF embedding_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    UPDATE embedding_jobs j
    SET status   = 'processing',
        attempts = j.attempts + 1,
        updated_at = now()
    WHERE j.id IN (
        SELECT c.id
        FROM embedding_jobs c
        WHERE c.status = 'pending'
          AND c.run_after <= now()
        ORDER BY c.run_after
        FOR UPDATE SKIP LOCKED
        LIMIT GREATEST(p_limit, 1)
    )
    RETURNING j.*;
END;
$$;


-- -----------------------------------------------------------------------------
-- 4. RLS — solo PANEL_ROLES leen; la escritura es exclusiva de service_role
--    (el worker), que sortea RLS. Sin acceso anónimo ni para el rol 'usuario'.
-- -----------------------------------------------------------------------------
ALTER TABLE embeddings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS panel_read ON embeddings;
CREATE POLICY panel_read ON embeddings
    FOR SELECT TO authenticated
    USING (public.is_panel_user());

DROP POLICY IF EXISTS panel_read ON embedding_jobs;
CREATE POLICY panel_read ON embedding_jobs
    FOR SELECT TO authenticated
    USING (public.is_panel_user());


-- Recargar el schema cache de PostgREST para exponer las nuevas tablas/funciones.
NOTIFY pgrst, 'reload schema';
