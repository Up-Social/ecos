-- =========================
-- Sistema de roles multi-rol
-- =========================
--
-- Reemplaza la tabla `profiles` (un único role por usuario) por:
--   - roles            : catálogo de roles disponibles
--   - user_profiles    : datos del usuario (nombre, apellidos, email, disabled)
--   - user_roles       : M:N entre auth.users y roles
--
-- Migra los datos existentes y al final hace DROP de profiles.
-- Es idempotente para las operaciones de creación (IF NOT EXISTS / ON CONFLICT),
-- pero el DROP TABLE profiles solo se ejecuta si la tabla existe.

-- =========================
-- 1. Catálogo de roles
-- =========================
CREATE TABLE IF NOT EXISTS roles (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT now()
);

INSERT INTO roles (key, label, description) VALUES
    ('superadmin', 'Superadmin', 'Acceso total al panel'),
    ('gestor',     'Gestor',     'Acceso al panel con permisos a definir'),
    ('usuario',    'Usuario',    'Solo parte pública, sin acceso al panel')
ON CONFLICT (key) DO NOTHING;

-- =========================
-- 2. Datos de usuario
-- =========================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nombre TEXT,
    apellidos TEXT,
    disabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

DROP TRIGGER IF EXISTS update_user_profiles ON user_profiles;
CREATE TRIGGER update_user_profiles
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- =========================
-- 3. M:N user ↔ roles
-- =========================
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_key TEXT REFERENCES roles(key) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT now(),
    PRIMARY KEY (user_id, role_key)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- =========================
-- 4. Migración de profiles → user_profiles + user_roles
-- =========================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        -- 4a. user_profiles
        INSERT INTO user_profiles (id, email, nombre, apellidos, disabled, created_at)
        SELECT
            p.id,
            u.email,
            p.nombre,
            p.apellidos,
            COALESCE(p.disabled, false),
            p.created_at
        FROM profiles p
        JOIN auth.users u ON u.id = p.id
        ON CONFLICT (id) DO NOTHING;

        -- 4b. user_roles: csanz → superadmin, resto → gestor
        INSERT INTO user_roles (user_id, role_key)
        SELECT
            p.id,
            CASE
                WHEN u.email = 'csanz@upsocial.org' THEN 'superadmin'
                ELSE 'gestor'
            END
        FROM profiles p
        JOIN auth.users u ON u.id = p.id
        ON CONFLICT DO NOTHING;

        -- 4c. drop la tabla antigua
        DROP TABLE profiles;
    END IF;
END $$;

-- =========================
-- 5. Helper para guards
-- =========================
CREATE OR REPLACE FUNCTION user_has_role(uid UUID, rkey TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = uid AND role_key = rkey
    );
$$;
