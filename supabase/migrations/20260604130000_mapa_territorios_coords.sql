-- =============================================================================
-- mapa_territorios_coords — Mapa geográfico del portal "Explorar".
--
-- 1. Añade coordenadas (lat/lon) cacheadas a `territorios`. Se rellenan por
--    geocodificación (Mapbox) desde el endpoint de panel /api/territorios/geocodificar.
-- 2. Función `mapa_dataset()` (SECURITY DEFINER) que devuelve, denormalizado, un
--    punto por AGENTE y por PROYECTO público con territorio geolocalizado, junto a
--    los ids de misiones/retos/proyectos/agentes relacionados (para el filtrado
--    restrictivo que hace el cliente). Solo expone entidades is_public.
--
-- Migración ADITIVA: no toca datos ni funciones previas. PostgREST no puede
-- expresar esta agregación encadenada con nested-selects, por eso es una RPC.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Coordenadas cacheadas en territorios (nullable; se geocodifican aparte).
-- -----------------------------------------------------------------------------
ALTER TABLE public.territorios
  ADD COLUMN IF NOT EXISTS latitud     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitud    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;


-- -----------------------------------------------------------------------------
-- 2. Dataset del mapa. Un punto por agente y por proyecto público cuyo territorio
--    tenga coordenadas. Los arrays permiten el filtrado por relaciones en cliente.
--    - Agentes  → ubicados por su sede_territorio_id.
--    - Proyectos → ubicados por el territorio del agente líder.
--    SECURITY DEFINER: lee territorios/pivotes con privilegios; solo devuelve
--    filas is_public (control en la propia consulta).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mapa_dataset()
RETURNS TABLE (
    tipo              TEXT,
    entidad_id        UUID,
    nombre            TEXT,
    latitud           DOUBLE PRECISION,
    longitud          DOUBLE PRECISION,
    territorio_id     UUID,
    territorio_nombre TEXT,
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
    -- Proyectos públicos de cada agente (los que lidera o en los que participa).
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
    -- AGENTES
    SELECT
        'agentes'::TEXT,
        a.id,
        a.nombre,
        t.latitud,
        t.longitud,
        t.id,
        t.nombre,
        COALESCE(array_agg(DISTINCT pm.mision_id) FILTER (WHERE pm.mision_id IS NOT NULL), '{}'::UUID[]),
        COALESCE(array_agg(DISTINCT pr.reto_id)   FILTER (WHERE pr.reto_id   IS NOT NULL), '{}'::UUID[]),
        COALESCE(array_agg(DISTINCT ap.proyecto_id) FILTER (WHERE ap.proyecto_id IS NOT NULL), '{}'::UUID[]),
        ARRAY[a.id]
    FROM agentes a
    JOIN territorios t
      ON t.id = a.sede_territorio_id
     AND t.latitud IS NOT NULL
     AND t.longitud IS NOT NULL
    LEFT JOIN agente_proyectos ap ON ap.agente_id = a.id
    LEFT JOIN proyectos_misiones pm ON pm.proyecto_id = ap.proyecto_id
    LEFT JOIN proyectos_retos    pr ON pr.proyecto_id = ap.proyecto_id
    WHERE a.is_public
    GROUP BY a.id, a.nombre, t.id, t.nombre, t.latitud, t.longitud

    UNION ALL

    -- PROYECTOS (ubicados por el territorio del agente líder)
    SELECT
        'proyectos'::TEXT,
        p.id,
        p.nombre,
        t.latitud,
        t.longitud,
        t.id,
        t.nombre,
        COALESCE(array_agg(DISTINCT pm.mision_id) FILTER (WHERE pm.mision_id IS NOT NULL), '{}'::UUID[]),
        COALESCE(array_agg(DISTINCT pr.reto_id)   FILTER (WHERE pr.reto_id   IS NOT NULL), '{}'::UUID[]),
        ARRAY[p.id],
        COALESCE(array_agg(DISTINCT pa.agente_id) FILTER (WHERE pa.agente_id IS NOT NULL), '{}'::UUID[]) || ARRAY[p.agente_lider_id]
    FROM proyectos p
    JOIN agentes al ON al.id = p.agente_lider_id
    JOIN territorios t
      ON t.id = al.sede_territorio_id
     AND t.latitud IS NOT NULL
     AND t.longitud IS NOT NULL
    LEFT JOIN proyectos_misiones pm ON pm.proyecto_id = p.id
    LEFT JOIN proyectos_retos    pr ON pr.proyecto_id = p.id
    LEFT JOIN proyectos_agentes  pa ON pa.proyecto_id = p.id
    WHERE p.is_public
    GROUP BY p.id, p.nombre, t.id, t.nombre, t.latitud, t.longitud, p.agente_lider_id;
$$;


-- -----------------------------------------------------------------------------
-- 3. Permisos: el mapa es PÚBLICO (anónimo). La función ya filtra is_public.
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.mapa_dataset() TO anon, authenticated;


-- Recargar el schema cache de PostgREST para exponer la nueva RPC y columnas.
NOTIFY pgrst, 'reload schema';
