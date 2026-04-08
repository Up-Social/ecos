-- =========================
-- FK user_roles → user_profiles para que PostgREST pueda resolver
-- el nested select user_profiles(... user_roles(role_key))
-- =========================
--
-- user_roles.user_id ya apunta a auth.users(id). PostgREST necesita ver
-- una relación entre user_roles y user_profiles (que están en el schema
-- público) para poder embeberlo en queries. Añadimos una segunda FK
-- hacia user_profiles(id) — no hay conflicto porque un mismo columna
-- puede tener varias FK, y user_profiles.id === auth.users.id.

ALTER TABLE user_roles
    DROP CONSTRAINT IF EXISTS user_roles_user_id_profile_fkey;

ALTER TABLE user_roles
    ADD CONSTRAINT user_roles_user_id_profile_fkey
    FOREIGN KEY (user_id)
    REFERENCES user_profiles(id)
    ON DELETE CASCADE;

-- Notificar a PostgREST para que recargue el schema cache inmediatamente
NOTIFY pgrst, 'reload schema';
