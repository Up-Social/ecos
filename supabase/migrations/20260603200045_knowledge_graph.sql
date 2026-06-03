-- =============================================================================
-- knowledge_graph — Capa Knowledge Graph de ECOS v2 (Fase 03).
--
-- Añade un grafo de conocimiento GENÉRICO y POLIMÓRFICO que COEXISTE con los
-- pivotes M:N existentes (retos_misiones, proyectos_agentes, innovaciones_retos,
-- recomendaciones_hallazgos). NO los sustituye ni los migra.
--
--   relationship_types : catálogo de tipos de relación.
--   relationships      : aristas dirigidas entre dos entidades de dominio.
--
-- Migración ADITIVA y no destructiva:
--   - No modifica ni elimina tablas, columnas ni datos existentes.
--   - Añade dos tablas nuevas, sus índices, constraints, FK, RLS y políticas.
--   - Añade triggers de integridad polimórfica (validación de existencia +
--     limpieza de aristas huérfanas) sin alterar el comportamiento del DELETE
--     de las entidades de dominio.
--
-- Entidades soportadas:
--   misiones, retos, agentes, proyectos, innovaciones, hallazgos, recomendaciones
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Catálogo de tipos de relación
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relationship_types (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT,
    -- null = el tipo aplica a cualquier entidad de origen/destino
    source_entity_type TEXT CHECK (
        source_entity_type IS NULL OR source_entity_type IN (
            'misiones', 'retos', 'agentes', 'proyectos',
            'innovaciones', 'hallazgos', 'recomendaciones'
        )
    ),
    target_entity_type TEXT CHECK (
        target_entity_type IS NULL OR target_entity_type IN (
            'misiones', 'retos', 'agentes', 'proyectos',
            'innovaciones', 'hallazgos', 'recomendaciones'
        )
    ),
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- 2. Aristas del grafo (relaciones polimórficas dirigidas)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relationships (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity_type   TEXT NOT NULL CHECK (
        source_entity_type IN (
            'misiones', 'retos', 'agentes', 'proyectos',
            'innovaciones', 'hallazgos', 'recomendaciones'
        )
    ),
    source_entity_id     UUID NOT NULL,
    relationship_type_id UUID NOT NULL REFERENCES relationship_types(id) ON DELETE RESTRICT,
    target_entity_type   TEXT NOT NULL CHECK (
        target_entity_type IN (
            'misiones', 'retos', 'agentes', 'proyectos',
            'innovaciones', 'hallazgos', 'recomendaciones'
        )
    ),
    target_entity_id     UUID NOT NULL,
    description          TEXT,
    -- FK hacia usuarios: siempre user_profiles(id) (convención del proyecto).
    -- auth.uid() rellena automáticamente el autor en inserts vía PostgREST.
    created_by           UUID DEFAULT auth.uid() REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Evita aristas duplicadas (mismo origen, tipo y destino).
    CONSTRAINT relationships_unique UNIQUE (
        source_entity_type, source_entity_id,
        relationship_type_id,
        target_entity_type, target_entity_id
    ),

    -- Evita la auto-relación trivial (una entidad consigo misma).
    CONSTRAINT relationships_no_self CHECK (
        NOT (source_entity_type = target_entity_type
             AND source_entity_id = target_entity_id)
    )
);

-- Índices para recorrer el grafo por origen, destino y tipo.
CREATE INDEX IF NOT EXISTS idx_relationships_source
    ON relationships (source_entity_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target
    ON relationships (target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type
    ON relationships (relationship_type_id);


-- -----------------------------------------------------------------------------
-- 3. Integridad polimórfica: validar existencia de origen y destino
--    (no hay FK nativa hacia una tabla dinámica → se valida con trigger).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_relationship_entities()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    exists_src BOOLEAN;
    exists_tgt BOOLEAN;
BEGIN
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id = $1)',
                   NEW.source_entity_type)
        INTO exists_src USING NEW.source_entity_id;
    IF NOT exists_src THEN
        RAISE EXCEPTION 'La entidad origen %/% no existe',
            NEW.source_entity_type, NEW.source_entity_id;
    END IF;

    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id = $1)',
                   NEW.target_entity_type)
        INTO exists_tgt USING NEW.target_entity_id;
    IF NOT exists_tgt THEN
        RAISE EXCEPTION 'La entidad destino %/% no existe',
            NEW.target_entity_type, NEW.target_entity_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_relationship_entities ON relationships;
CREATE TRIGGER check_relationship_entities
    BEFORE INSERT OR UPDATE ON relationships
    FOR EACH ROW
    EXECUTE FUNCTION validate_relationship_entities();


-- -----------------------------------------------------------------------------
-- 4. Limpieza de aristas huérfanas al borrar una entidad de dominio.
--    Trigger AFTER DELETE en cada entidad → borra las relationships que la
--    referencian (como origen o destino). No altera el DELETE en sí.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_relationships_on_entity_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM relationships
    WHERE (source_entity_type = TG_TABLE_NAME AND source_entity_id = OLD.id)
       OR (target_entity_type = TG_TABLE_NAME AND target_entity_id = OLD.id);
    RETURN OLD;
END;
$$;

DO $$
DECLARE
    t TEXT;
    entidades TEXT[] := ARRAY[
        'misiones', 'retos', 'agentes', 'proyectos',
        'innovaciones', 'hallazgos', 'recomendaciones'
    ];
BEGIN
    FOREACH t IN ARRAY entidades LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS cleanup_relationships ON public.%I', t);
        EXECUTE format($f$
            CREATE TRIGGER cleanup_relationships
              AFTER DELETE ON public.%I
              FOR EACH ROW
              EXECUTE FUNCTION cleanup_relationships_on_entity_delete()
        $f$, t);
    END LOOP;
END $$;


-- -----------------------------------------------------------------------------
-- 5. RLS — mismo modelo que las tablas de dominio: PANEL_ROLES leen y escriben.
--    (El acceso público de solo lectura se definirá en fases posteriores.)
-- -----------------------------------------------------------------------------
ALTER TABLE relationship_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS panel_all ON relationship_types;
CREATE POLICY panel_all ON relationship_types
    FOR ALL TO authenticated
    USING (public.is_panel_user())
    WITH CHECK (public.is_panel_user());

DROP POLICY IF EXISTS panel_all ON relationships;
CREATE POLICY panel_all ON relationships
    FOR ALL TO authenticated
    USING (public.is_panel_user())
    WITH CHECK (public.is_panel_user());


-- -----------------------------------------------------------------------------
-- 6. Semilla de tipos de relación base (idempotente).
--    Tipos cualitativos que NO duplican los pivotes M:N existentes.
-- -----------------------------------------------------------------------------
INSERT INTO relationship_types (code, name, description, source_entity_type, target_entity_type) VALUES
    ('colabora_con',  'Colabora con',            'Colaboración entre dos agentes',                 'agentes',      'agentes'),
    ('financia_a',    'Financia a',              'Un agente financia un proyecto',                 'agentes',      'proyectos'),
    ('deriva_de',     'Deriva de',               'Una innovación deriva de un hallazgo previo',    'innovaciones', 'hallazgos'),
    ('inspira_a',     'Inspira a',               'Una innovación inspira a otra',                  'innovaciones', 'innovaciones'),
    ('complementa_a', 'Complementa a',           'Un proyecto complementa a otro proyecto',        'proyectos',    'proyectos'),
    ('relacionado_con','Relacionado con',        'Relación genérica entre dos entidades',          NULL,           NULL)
ON CONFLICT (code) DO NOTHING;


-- Recargar el schema cache de PostgREST para exponer las nuevas tablas/relaciones.
NOTIFY pgrst, 'reload schema';
