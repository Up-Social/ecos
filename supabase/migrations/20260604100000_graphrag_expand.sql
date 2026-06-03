-- =============================================================================
-- graphrag_expand — Expansión relacional para GraphRAG (Fase 13).
--
-- graphrag_related(p_types, p_ids, only_public, limit): dado un conjunto de
-- entidades semilla (pares type/id paralelos), devuelve las entidades conectadas
-- a 1 salto vía `relationships` (entrantes y salientes), con el tipo de relación
-- para trazabilidad. Filtra por is_public cuando only_public = true.
--
-- SECURITY DEFINER: `relationships` tiene RLS solo-panel; esta función permite a
-- usuarios no-panel (portal) expandir SOLO contenido público.
--
-- Migración ADITIVA y NO destructiva. Reutiliza is_public_entity (Fase 12).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.graphrag_related(
    p_types      TEXT[],
    p_ids        UUID[],
    only_public  BOOLEAN DEFAULT true,
    p_limit      INT DEFAULT 20
)
RETURNS TABLE (
    entity_type   TEXT,
    entity_id     UUID,
    relation_code TEXT,
    relation_name TEXT,
    direction     TEXT,
    seed_type     TEXT,
    seed_id       UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH seeds AS (
        SELECT t, id FROM unnest(p_types, p_ids) AS s(t, id)
    ),
    edges AS (
        -- Saliente: la semilla es origen → relacionada es destino.
        SELECT
            r.target_entity_type AS entity_type,
            r.target_entity_id   AS entity_id,
            rt.code              AS relation_code,
            rt.name              AS relation_name,
            'saliente'           AS direction,
            r.source_entity_type AS seed_type,
            r.source_entity_id   AS seed_id
        FROM relationships r
        JOIN seeds s
          ON s.t = r.source_entity_type AND s.id = r.source_entity_id
        LEFT JOIN relationship_types rt ON rt.id = r.relationship_type_id

        UNION ALL

        -- Entrante: la semilla es destino → relacionada es origen.
        SELECT
            r.source_entity_type,
            r.source_entity_id,
            rt.code,
            rt.name,
            'entrante',
            r.target_entity_type,
            r.target_entity_id
        FROM relationships r
        JOIN seeds s
          ON s.t = r.target_entity_type AND s.id = r.target_entity_id
        LEFT JOIN relationship_types rt ON rt.id = r.relationship_type_id
    )
    SELECT e.entity_type, e.entity_id, e.relation_code, e.relation_name,
           e.direction, e.seed_type, e.seed_id
    FROM edges e
    WHERE (NOT only_public OR public.is_public_entity(e.entity_type, e.entity_id))
    LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.graphrag_related(TEXT[], UUID[], BOOLEAN, INT)
    TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
