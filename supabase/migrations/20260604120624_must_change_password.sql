-- =============================================================================
-- must_change_password — Forzar cambio de contraseña en el primer acceso.
--
-- Cuando un administrador crea un usuario con una contraseña inicial, el usuario
-- debe establecer una contraseña propia la primera vez que entra. Este flag lo
-- marca el alta (`/api/users` POST) y lo limpia el propio usuario tras cambiarla
-- (página `/cambiar-password`), bajo la política RLS self-update de user_profiles.
--
-- Migración ADITIVA e idempotente: añade una columna con DEFAULT false, por lo
-- que las filas existentes quedan sin obligación de cambio.
-- =============================================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Recargar el schema cache de PostgREST para exponer la nueva columna.
NOTIFY pgrst, 'reload schema';
