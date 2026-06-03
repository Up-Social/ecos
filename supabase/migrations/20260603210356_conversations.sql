-- =============================================================================
-- conversations — Persistencia de conversaciones del asistente (Fase 09).
--
-- Crea las tablas conversations / messages / conversation_sources con su RLS.
-- SOLO PERSISTENCIA: no conecta IA (eso es la Fase 13/14). Cualquier usuario
-- autenticado gestiona SUS conversaciones; superadmin tiene lectura (auditoría).
--
-- Aditiva e idempotente. No modifica datos ni tablas existentes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Conversaciones
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL DEFAULT auth.uid()
                  REFERENCES user_profiles(id) ON DELETE CASCADE,
    title       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user
    ON conversations (user_id, updated_at DESC);

DROP TRIGGER IF EXISTS update_conversations ON conversations;
CREATE TRIGGER update_conversations
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- -----------------------------------------------------------------------------
-- 2. Mensajes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages (conversation_id, created_at);

-- -----------------------------------------------------------------------------
-- 3. Fuentes de un mensaje (entidades que respaldan la respuesta)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_sources (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (
        entity_type IN (
            'misiones', 'retos', 'agentes', 'proyectos',
            'innovaciones', 'hallazgos', 'recomendaciones'
        )
    ),
    entity_id   UUID NOT NULL,
    score       DOUBLE PRECISION,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_sources_message
    ON conversation_sources (message_id);

-- -----------------------------------------------------------------------------
-- 4. RLS — propiedad por usuario; superadmin lectura (auditoría)
-- -----------------------------------------------------------------------------
ALTER TABLE conversations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sources  ENABLE ROW LEVEL SECURITY;

-- conversations
DROP POLICY IF EXISTS conversations_owner ON conversations;
CREATE POLICY conversations_owner ON conversations
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS conversations_superadmin_read ON conversations;
CREATE POLICY conversations_superadmin_read ON conversations
    FOR SELECT TO authenticated
    USING (public.is_superadmin());

-- messages (acceso si el usuario es dueño de la conversación)
DROP POLICY IF EXISTS messages_owner ON messages;
CREATE POLICY messages_owner ON messages
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS messages_superadmin_read ON messages;
CREATE POLICY messages_superadmin_read ON messages
    FOR SELECT TO authenticated
    USING (public.is_superadmin());

-- conversation_sources (acceso vía mensaje → conversación del usuario)
DROP POLICY IF EXISTS conversation_sources_owner ON conversation_sources;
CREATE POLICY conversation_sources_owner ON conversation_sources
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            WHERE m.id = conversation_sources.message_id
              AND c.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            WHERE m.id = conversation_sources.message_id
              AND c.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS conversation_sources_superadmin_read ON conversation_sources;
CREATE POLICY conversation_sources_superadmin_read ON conversation_sources
    FOR SELECT TO authenticated
    USING (public.is_superadmin());

-- Recargar el schema cache de PostgREST.
NOTIFY pgrst, 'reload schema';
