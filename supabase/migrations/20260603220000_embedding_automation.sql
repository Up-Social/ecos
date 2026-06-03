-- =============================================================================
-- embedding_automation — Automatización de embeddings de ECOS v2 (Fase 11).
--
-- Encola un embedding_job AUTOMÁTICAMENTE cuando cambia cualquiera de las 7
-- entidades de dominio (INSERT o UPDATE), reutilizando enqueue_embedding_job
-- (Fase 10). Añade además una función de backfill para encolar lo ya existente.
--
-- Migración ADITIVA, idempotente y NO destructiva:
--   - No modifica ni elimina tablas, columnas ni datos existentes.
--   - Los triggers solo ENCOLAN; no alteran el comportamiento del INSERT/UPDATE.
--   - La idempotencia por content_hash (en el worker) y el índice único de job
--     activo por entidad evitan trabajo redundante aunque se encole de más.
--
-- NO incluye GraphRAG ni búsqueda semántica (Fases 12-13).
--
-- Entidades: misiones, retos, agentes, proyectos, innovaciones, hallazgos,
--            recomendaciones.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Trigger: al crear/editar una entidad, encolar su (re)embedding.
--    SECURITY DEFINER → puede insertar en embedding_jobs pese al RLS de la cola.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_embedding_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.enqueue_embedding_job(TG_TABLE_NAME, NEW.id);
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    t TEXT;
    entidades TEXT[] := ARRAY[
        'misiones', 'retos', 'agentes', 'proyectos',
        'innovaciones', 'hallazgos', 'recomendaciones'
    ];
BEGIN
    FOREACH t IN ARRAY entidades LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS enqueue_embedding ON public.%I', t);
        EXECUTE format($f$
            CREATE TRIGGER enqueue_embedding
              AFTER INSERT OR UPDATE ON public.%I
              FOR EACH ROW
              EXECUTE FUNCTION public.enqueue_embedding_on_change()
        $f$, t);
    END LOOP;
END $$;


-- -----------------------------------------------------------------------------
-- 2. Backfill: encolar TODAS las filas existentes de las 7 entidades.
--    Devuelve cuántos jobs se encolaron/reactivaron. Idéntica semántica de
--    conflicto que enqueue_embedding_job (1 job activo por entidad).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_all_embeddings()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    t        TEXT;
    c        INT;
    total    INT := 0;
    entidades TEXT[] := ARRAY[
        'misiones', 'retos', 'agentes', 'proyectos',
        'innovaciones', 'hallazgos', 'recomendaciones'
    ];
BEGIN
    FOREACH t IN ARRAY entidades LOOP
        EXECUTE format(
            'INSERT INTO embedding_jobs (entity_type, entity_id)
               SELECT %L, id FROM public.%I
             ON CONFLICT (entity_type, entity_id) WHERE status IN (''pending'', ''processing'')
             DO UPDATE SET run_after = now(), updated_at = now()',
            t, t);
        GET DIAGNOSTICS c = ROW_COUNT;
        total := total + c;
    END LOOP;
    RETURN total;
END;
$$;


-- Recargar el schema cache de PostgREST para exponer la nueva función RPC.
NOTIFY pgrst, 'reload schema';
