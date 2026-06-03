-- =============================================================================
-- semantic_search — Búsqueda semántica híbrida de ECOS v2 (Fase 12).
--
-- Añade dos funciones para la búsqueda vectorial filtrada:
--   is_public_entity(type, id) : visibilidad pública de una entidad de dominio.
--   match_embeddings(...)      : vecinos más próximos por coseno (HNSW) con
--                                prefiltro SQL por entity_type y por is_public.
--
-- Migración ADITIVA y NO destructiva: no toca tablas, datos ni funciones previas.
-- Reutiliza embeddings + índice HNSW (Fase 10) y la columna is_public (Fase 08).
--
-- NO incluye GraphRAG ni UI (Fases 13-14).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. ¿Es pública una entidad? Solo las 5 entidades del portal tienen is_public;
--    hallazgos y recomendaciones NUNCA son públicas.
--    SECURITY DEFINER: se invoca desde match_embeddings (también para anónimos).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_public_entity(p_type TEXT, p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v BOOLEAN;
BEGIN
    IF p_type NOT IN ('misiones', 'retos', 'agentes', 'proyectos', 'innovaciones') THEN
        RETURN false;
    END IF;
    EXECUTE format('SELECT is_public FROM public.%I WHERE id = $1', p_type)
        INTO v USING p_id;
    RETURN COALESCE(v, false);
END;
$$;


-- -----------------------------------------------------------------------------
-- 2. Búsqueda vectorial filtrada.
--    - query_embedding : vector(1536) de la consulta (mismo modelo que los datos).
--    - match_count     : nº de resultados (top-k).
--    - filter_entity_type : si no es NULL, restringe a ese tipo.
--    - only_public     : si true, solo entidades públicas (plano anónimo/portal).
--    Devuelve entity_type, entity_id y similitud coseno (1 - distancia).
--    SECURITY DEFINER para poder leer embeddings (RLS de panel) también en
--    llamadas anónimas; el filtro de is_public lo aplica la propia función.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_embeddings(
    query_embedding     VECTOR(1536),
    match_count         INT DEFAULT 10,
    filter_entity_type  TEXT DEFAULT NULL,
    only_public         BOOLEAN DEFAULT true
)
RETURNS TABLE (
    entity_type TEXT,
    entity_id   UUID,
    similarity  DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        e.entity_type,
        e.entity_id,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM embeddings e
    WHERE e.embedding IS NOT NULL
      AND (filter_entity_type IS NULL OR e.entity_type = filter_entity_type)
      AND (NOT only_public OR public.is_public_entity(e.entity_type, e.entity_id))
    ORDER BY e.embedding <=> query_embedding
    LIMIT GREATEST(match_count, 1);
$$;


-- -----------------------------------------------------------------------------
-- 3. Permisos: ejecutables por anónimos y autenticados (el control fino de
--    is_public lo hace la propia función vía only_public).
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.is_public_entity(TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_embeddings(VECTOR, INT, TEXT, BOOLEAN) TO anon, authenticated;


-- Recargar el schema cache de PostgREST para exponer las nuevas RPC.
NOTIFY pgrst, 'reload schema';
