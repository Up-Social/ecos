-- =========================
-- PROFILES: campos para gestión de usuarios desde el panel
-- =========================
--
-- Añade nombre, apellidos y flag `disabled` para permitir
-- dar de alta/editar/deshabilitar usuarios desde la sección
-- de Administración, sin llegar a borrarlos.

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS nombre TEXT,
    ADD COLUMN IF NOT EXISTS apellidos TEXT,
    ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();

-- Trigger updated_at para profiles (reutiliza update_timestamp)
DROP TRIGGER IF EXISTS update_profiles ON profiles;
CREATE TRIGGER update_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
