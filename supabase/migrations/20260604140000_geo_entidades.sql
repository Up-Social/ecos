-- =============================================================================
-- geo_entidades — Geolocalización por entidad (agentes y proyectos).
--
-- 1. Coordenadas propias (lat/lon) en `agentes` y `proyectos`, editables desde
--    el CRUD y rellenables por geocodificación de su región (municipio / CCAA).
-- 2. Reescribe `mapa_dataset()` para situar cada entidad por SUS coordenadas
--    (fallback al territorio del agente / agente líder) y agrupar por UBICACIÓN
--    (territorio, municipio o CCAA), no solo por territorio.
--
-- Migración ADITIVA. Reemplaza la función `mapa_dataset` de la migración previa
-- (cambia el tipo de retorno → DROP + CREATE).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Coordenadas por entidad (nullable; se rellenan en el CRUD o geocodificando).
-- -----------------------------------------------------------------------------
ALTER TABLE public.agentes
  ADD COLUMN IF NOT EXISTS latitud     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitud    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

ALTER TABLE public.proyectos
  ADD COLUMN IF NOT EXISTS latitud     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitud    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;


-- -----------------------------------------------------------------------------
-- 2. Dataset del mapa (reescrito). Un punto por agente y por proyecto público
--    con coordenadas (propias o heredadas del territorio). Agrupa por ubicación:
--      · ubicacion_id     — territorio (uuid) / 'mun:<municipio>' / 'ccaa:<ccaa>'
--      · ubicacion_nombre — etiqueta legible de esa ubicación
--    SECURITY DEFINER: solo devuelve filas is_public.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mapa_dataset();

CREATE FUNCTION public.mapa_dataset()
RETURNS TABLE (
    tipo              TEXT,
    entidad_id        UUID,
    nombre            TEXT,
    latitud           DOUBLE PRECISION,
    longitud          DOUBLE PRECISION,
    ubicacion_id      TEXT,
    ubicacion_nombre  TEXT,
    mision_ids        UUID[],
    reto_ids          UUID[],
    proyecto_ids      UUID[],
    agente_ids        UUID[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH agente_proyectos AS (
        SELECT a.id AS agente_id, p.id AS proyecto_id
        FROM agentes a
        JOIN proyectos p
          ON p.is_public
         AND (
              p.agente_lider_id = a.id
              OR EXISTS (
                   SELECT 1 FROM proyectos_agentes pa
                   WHERE pa.proyecto_id = p.id AND pa.agente_id = a.id
                 )
             )
    )
    -- AGENTES (coords propias o del territorio de su sede)
    SELECT
        'agentes'::TEXT,
        a.id,
        a.nombre,
        COALESCE(a.latitud, t.latitud),
        COALESCE(a.longitud, t.longitud),
        COALESCE(t.id::TEXT, 'mun:' || lower(a.municipio_sede), 'ag:' || a.id::TEXT),
        COALESCE(t.nombre, a.municipio_sede, a.nombre),
        COALESCE(array_agg(DISTINCT pm.mision_id) FILTER (WHERE pm.mision_id IS NOT NULL), '{}'::UUID[]),
        COALESCE(array_agg(DISTINCT pr.reto_id)   FILTER (WHERE pr.reto_id   IS NOT NULL), '{}'::UUID[]),
        COALESCE(array_agg(DISTINCT ap.proyecto_id) FILTER (WHERE ap.proyecto_id IS NOT NULL), '{}'::UUID[]),
        ARRAY[a.id]
    FROM agentes a
    LEFT JOIN territorios t ON t.id = a.sede_territorio_id
    LEFT JOIN agente_proyectos ap ON ap.agente_id = a.id
    LEFT JOIN proyectos_misiones pm ON pm.proyecto_id = ap.proyecto_id
    LEFT JOIN proyectos_retos    pr ON pr.proyecto_id = ap.proyecto_id
    WHERE a.is_public
      AND COALESCE(a.latitud, t.latitud) IS NOT NULL
    GROUP BY a.id, t.id

    UNION ALL

    -- PROYECTOS (coords propias o del territorio del agente líder)
    SELECT
        'proyectos'::TEXT,
        p.id,
        p.nombre,
        COALESCE(p.latitud, t.latitud),
        COALESCE(p.longitud, t.longitud),
        COALESCE('ccaa:' || lower(p.ccaa), t.id::TEXT, 'pr:' || p.id::TEXT),
        COALESCE(p.ccaa, t.nombre, p.nombre),
        COALESCE(array_agg(DISTINCT pm.mision_id) FILTER (WHERE pm.mision_id IS NOT NULL), '{}'::UUID[]),
        COALESCE(array_agg(DISTINCT pr.reto_id)   FILTER (WHERE pr.reto_id   IS NOT NULL), '{}'::UUID[]),
        ARRAY[p.id],
        COALESCE(array_agg(DISTINCT pa.agente_id) FILTER (WHERE pa.agente_id IS NOT NULL), '{}'::UUID[]) || ARRAY[p.agente_lider_id]
    FROM proyectos p
    LEFT JOIN agentes al ON al.id = p.agente_lider_id
    LEFT JOIN territorios t ON t.id = al.sede_territorio_id
    LEFT JOIN proyectos_misiones pm ON pm.proyecto_id = p.id
    LEFT JOIN proyectos_retos    pr ON pr.proyecto_id = p.id
    LEFT JOIN proyectos_agentes  pa ON pa.proyecto_id = p.id
    WHERE p.is_public
      AND COALESCE(p.latitud, t.latitud) IS NOT NULL
    GROUP BY p.id, al.id, t.id;
$$;

GRANT EXECUTE ON FUNCTION public.mapa_dataset() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
