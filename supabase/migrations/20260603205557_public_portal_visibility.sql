-- =============================================================================
-- public_portal_visibility — Habilita la visibilidad pública opt-in para el
-- portal público (Fase 08).
--
-- Añade `is_public` (default false) a las entidades explorables y una política
-- RLS `public_read` que permite a `anon` y `authenticated` LEER únicamente las
-- filas marcadas como públicas.
--
-- Modelo de seguridad:
--   - `default false` → nada se expone hasta marcarlo explícitamente.
--   - Las políticas se combinan con OR: `panel_all` (PANEL_ROLES, FOR ALL) sigue
--     vigente; `public_read` añade SELECT de filas públicas para anon/usuario.
--   - Escritura del portal: ninguna (solo SELECT).
--
-- Aditiva e idempotente. No modifica datos existentes.
-- =============================================================================

DO $$
DECLARE
    t text;
    entidades text[] := ARRAY[
        'misiones', 'retos', 'agentes', 'proyectos', 'innovaciones'
    ];
BEGIN
    FOREACH t IN ARRAY entidades LOOP
        -- 1. Columna de visibilidad pública (opt-in)
        EXECUTE format(
            'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false',
            t
        );

        -- 2. Política de lectura pública (solo filas is_public = true)
        EXECUTE format('DROP POLICY IF EXISTS public_read ON public.%I', t);
        EXECUTE format($f$
            CREATE POLICY public_read ON public.%I
              FOR SELECT TO anon, authenticated
              USING (is_public = true)
        $f$, t);
    END LOOP;
END $$;

-- Recargar el schema cache de PostgREST.
NOTIFY pgrst, 'reload schema';
