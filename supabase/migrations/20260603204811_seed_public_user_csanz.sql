-- =============================================================================
-- seed_public_user_csanz — Garantiza que csanz@upsocial.org tenga los roles
-- 'superadmin' + 'usuario' (Fase 07: usuarios públicos).
--
-- Aditiva e idempotente: no elimina roles ni datos. Si el auth.user no existe
-- aún, no hace nada (se aplicará cuando exista).
-- =============================================================================

DO $$
DECLARE
    target_id UUID;
BEGIN
    SELECT id INTO target_id
    FROM auth.users
    WHERE email = 'csanz@upsocial.org'
    LIMIT 1;

    IF target_id IS NULL THEN
        RAISE NOTICE 'No existe auth.user con email csanz@upsocial.org — seed omitido';
        RETURN;
    END IF;

    -- Asegurar el perfil
    INSERT INTO user_profiles (id, email)
    VALUES (target_id, 'csanz@upsocial.org')
    ON CONFLICT (id) DO NOTHING;

    -- Asegurar ambos roles (superadmin + usuario)
    INSERT INTO user_roles (user_id, role_key)
    VALUES (target_id, 'superadmin')
    ON CONFLICT DO NOTHING;

    INSERT INTO user_roles (user_id, role_key)
    VALUES (target_id, 'usuario')
    ON CONFLICT DO NOTHING;
END $$;
