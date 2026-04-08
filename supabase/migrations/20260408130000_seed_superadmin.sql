-- =========================
-- Promover csanz@upsocial.org a superadmin
-- =========================
--
-- Busca el auth.user por email y garantiza que tenga un profile con
-- role='superadmin'. Si el profile no existe, se crea. Si existe, se
-- actualiza el role sin tocar el resto de campos.

DO $$
DECLARE
    target_id UUID;
BEGIN
    SELECT id INTO target_id
    FROM auth.users
    WHERE email = 'csanz@upsocial.org'
    LIMIT 1;

    IF target_id IS NULL THEN
        RAISE NOTICE 'No existe auth.user con email csanz@upsocial.org — no se puede promover';
        RETURN;
    END IF;

    INSERT INTO profiles (id, role)
    VALUES (target_id, 'superadmin')
    ON CONFLICT (id) DO UPDATE
        SET role = 'superadmin';
END $$;
