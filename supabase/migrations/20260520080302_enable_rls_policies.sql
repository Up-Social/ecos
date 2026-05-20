-- =============================================================================
-- enable_rls_policies — Activa Row Level Security en todas las tablas de
-- `public` y crea las políticas necesarias.
--
-- Modelo:
--   - Solo PANEL_ROLES (superadmin, gestor) leen y escriben las tablas de
--     dominio. El rol `usuario` y `anon` quedan fuera del panel.
--   - Logs y auditoría (import_logs, insights_history): PANEL_ROLES solo
--     lectura; escritura reservada a service_role.
--   - Gestión de usuarios y roles: cada usuario lee lo suyo; superadmin
--     gestiona todo.
--   - Catálogo `roles`: cualquier authenticated puede leerlo.
--   - Las vistas pasan a `security_invoker = on` para respetar el RLS del
--     usuario que las consulta.
--
-- Servicios bypass:
--   - service_role (Edge Function `import-excel`, API routes con admin
--     client) tiene `bypassrls` y no se ve afectado por estas políticas.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Funciones helper SECURITY DEFINER
--    Evitan recursión cuando se usan en políticas sobre user_roles.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_panel_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND role_key IN ('superadmin', 'gestor')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND role_key = 'superadmin'
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_panel_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_panel_user() TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 2. Bloque A — Tablas de dominio: PANEL_ROLES leen y escriben todo.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    t text;
    dominio text[] := ARRAY[
        'territorios', 'misiones', 'retos', 'agentes',
        'proyectos', 'innovaciones', 'hallazgos', 'recomendaciones'
    ];
BEGIN
    FOREACH t IN ARRAY dominio LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS panel_all ON public.%I', t);
        EXECUTE format($f$
            CREATE POLICY panel_all ON public.%I
              FOR ALL TO authenticated
              USING (public.is_panel_user())
              WITH CHECK (public.is_panel_user())
        $f$, t);
    END LOOP;
END $$;


-- -----------------------------------------------------------------------------
-- 3. Bloque B — Pivotes M:N: mismo modelo PANEL_ROLES.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    t text;
    pivotes text[] := ARRAY[
        'retos_misiones', 'proyectos_agentes',
        'innovaciones_retos', 'recomendaciones_hallazgos'
    ];
BEGIN
    FOREACH t IN ARRAY pivotes LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS panel_all ON public.%I', t);
        EXECUTE format($f$
            CREATE POLICY panel_all ON public.%I
              FOR ALL TO authenticated
              USING (public.is_panel_user())
              WITH CHECK (public.is_panel_user())
        $f$, t);
    END LOOP;
END $$;


-- -----------------------------------------------------------------------------
-- 4. Bloque C — Logs y auditoría: PANEL_ROLES solo lectura.
--    insights_history ya tenía RLS habilitado sin políticas (lockdown total);
--    al añadir SELECT panel_read se desbloquea para el panel.
-- -----------------------------------------------------------------------------

ALTER TABLE public.import_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS panel_read ON public.import_logs;
CREATE POLICY panel_read ON public.import_logs
    FOR SELECT TO authenticated
    USING (public.is_panel_user());

DROP POLICY IF EXISTS panel_read ON public.insights_history;
CREATE POLICY panel_read ON public.insights_history
    FOR SELECT TO authenticated
    USING (public.is_panel_user());


-- -----------------------------------------------------------------------------
-- 5. Bloque D — Usuarios, roles y multirol.
-- -----------------------------------------------------------------------------

-- user_profiles ----------------------------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_select_self_or_admin ON public.user_profiles;
CREATE POLICY user_profiles_select_self_or_admin ON public.user_profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_superadmin());

DROP POLICY IF EXISTS user_profiles_insert_admin ON public.user_profiles;
CREATE POLICY user_profiles_insert_admin ON public.user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS user_profiles_update_self_or_admin ON public.user_profiles;
CREATE POLICY user_profiles_update_self_or_admin ON public.user_profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_superadmin())
    WITH CHECK (id = auth.uid() OR public.is_superadmin());

DROP POLICY IF EXISTS user_profiles_delete_admin ON public.user_profiles;
CREATE POLICY user_profiles_delete_admin ON public.user_profiles
    FOR DELETE TO authenticated
    USING (public.is_superadmin());

-- roles (catálogo) -------------------------------------------------------------
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_select_authenticated ON public.roles;
CREATE POLICY roles_select_authenticated ON public.roles
    FOR SELECT TO authenticated
    USING (true);
-- INSERT/UPDATE/DELETE: sin políticas → solo service_role.

-- user_roles -------------------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_roles_select_self_or_admin ON public.user_roles;
CREATE POLICY user_roles_select_self_or_admin ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_superadmin());

DROP POLICY IF EXISTS user_roles_insert_admin ON public.user_roles;
CREATE POLICY user_roles_insert_admin ON public.user_roles
    FOR INSERT TO authenticated
    WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS user_roles_update_admin ON public.user_roles;
CREATE POLICY user_roles_update_admin ON public.user_roles
    FOR UPDATE TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS user_roles_delete_admin ON public.user_roles;
CREATE POLICY user_roles_delete_admin ON public.user_roles
    FOR DELETE TO authenticated
    USING (public.is_superadmin());


-- -----------------------------------------------------------------------------
-- 6. Bloque E — Vistas: security_invoker = on
--    Hace que cada vista respete el RLS del usuario que la consulta
--    (en lugar de ejecutarse con permisos del creador).
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    v text;
    vistas text[] := ARRAY[
        'proyectos_misiones', 'proyectos_retos', 'innovaciones_misiones',
        'v_innovaciones_full', 'v_kpis_mision', 'v_cartera_innovacion',
        'v_cobertura_retos', 'v_retos_sin_innovacion', 'v_hallazgos_reto',
        'v_recomendaciones_mision', 'v_agentes_mision',
        'v_nivel_evidencia_mision', 'v_pipeline_madurez'
    ];
BEGIN
    FOREACH v IN ARRAY vistas LOOP
        EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on)', v);
    END LOOP;
END $$;


-- -----------------------------------------------------------------------------
-- 7. Verificación final: aborta si no existe ningún superadmin.
--    Sin esta guarda, aplicar RLS dejaría el panel inaccesible.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE role_key = 'superadmin') THEN
        RAISE EXCEPTION
            'No existe ningún superadmin en user_roles. Aplicar RLS dejaría el panel inaccesible. '
            'Asegúrate de que la migration seed_superadmin se ha ejecutado y que el auth.user existe.';
    END IF;
END $$;
