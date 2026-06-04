-- =============================================================================
-- graph_backfill_estructural — Pobla el Knowledge Graph (`relationships`) con
-- las relaciones ESTRUCTURALES del dominio (FKs y pivotes), para que GraphRAG y
-- el grafo tengan datos reales.
--
--   1. Añade los tipos de relación estructurales al catálogo.
--   2. Funciones helper + triggers que MANTIENEN sincronizadas las aristas al
--      crear/editar/borrar entidades y vínculos (también en cada import Excel).
--   3. Backfill de un solo paso desde el estado actual de la BD.
--
-- Relaciones materializadas:
--   agente   --lidera-->       proyecto      (proyectos.agente_lider_id)
--   agente   --participa_en--> proyecto      (proyectos_agentes)
--   innov.   --enmarca_en-->   proyecto      (innovaciones.proyecto_id)
--   innov.   --aborda-->       reto          (innovaciones_retos)
--   reto     --contribuye_a--> misión        (retos_misiones)
--   hallazgo --evidencia-->    innovación    (hallazgos.innovacion_id)
--   recom.   --se_basa_en-->   hallazgo      (recomendaciones_hallazgos)
--
-- Migración ADITIVA. Coexiste con los pivotes (no los sustituye).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Tipos de relación estructurales (idempotente).
-- -----------------------------------------------------------------------------
INSERT INTO relationship_types (code, name, description, source_entity_type, target_entity_type) VALUES
    ('lidera',       'Lidera',        'Un agente lidera un proyecto',                       'agentes',        'proyectos'),
    ('participa_en', 'Participa en',  'Un agente participa como socio en un proyecto',      'agentes',        'proyectos'),
    ('enmarca_en',   'Se enmarca en', 'Una innovación se desarrolla dentro de un proyecto', 'innovaciones',   'proyectos'),
    ('aborda',       'Aborda',        'Una innovación aborda un reto',                      'innovaciones',   'retos'),
    ('contribuye_a', 'Contribuye a',  'Un reto contribuye a una misión',                    'retos',          'misiones'),
    ('evidencia',    'Evidencia',     'Un hallazgo evidencia una innovación',               'hallazgos',      'innovaciones'),
    ('se_basa_en',   'Se basa en',    'Una recomendación se basa en un hallazgo',           'recomendaciones','hallazgos')
ON CONFLICT (code) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 2. Helpers: alta/baja idempotente de una arista por código de tipo.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._rel_upsert(
    p_src_type TEXT, p_src_id UUID, p_code TEXT, p_tgt_type TEXT, p_tgt_id UUID
) RETURNS VOID
LANGUAGE sql
SET search_path = public
AS $$
    INSERT INTO relationships (
        source_entity_type, source_entity_id,
        relationship_type_id, target_entity_type, target_entity_id
    )
    SELECT p_src_type, p_src_id, rt.id, p_tgt_type, p_tgt_id
    FROM relationship_types rt
    WHERE rt.code = p_code
    ON CONFLICT ON CONSTRAINT relationships_unique DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public._rel_delete(
    p_src_type TEXT, p_src_id UUID, p_code TEXT, p_tgt_type TEXT, p_tgt_id UUID
) RETURNS VOID
LANGUAGE sql
SET search_path = public
AS $$
    DELETE FROM relationships r
    USING relationship_types rt
    WHERE rt.code = p_code
      AND r.relationship_type_id = rt.id
      AND r.source_entity_type = p_src_type AND r.source_entity_id = p_src_id
      AND r.target_entity_type = p_tgt_type AND r.target_entity_id = p_tgt_id;
$$;


-- -----------------------------------------------------------------------------
-- 3a. Trigger genérico para PIVOTES (M:N).
--     TG_ARGV = [code, src_type, src_col, tgt_type, tgt_col]
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_rel_pivot()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_code TEXT := TG_ARGV[0];
    v_src_type TEXT := TG_ARGV[1];
    v_src_col TEXT := TG_ARGV[2];
    v_tgt_type TEXT := TG_ARGV[3];
    v_tgt_col TEXT := TG_ARGV[4];
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM _rel_upsert(
            v_src_type, (to_jsonb(NEW) ->> v_src_col)::UUID,
            v_code,
            v_tgt_type, (to_jsonb(NEW) ->> v_tgt_col)::UUID
        );
        RETURN NEW;
    ELSE
        PERFORM _rel_delete(
            v_src_type, (to_jsonb(OLD) ->> v_src_col)::UUID,
            v_code,
            v_tgt_type, (to_jsonb(OLD) ->> v_tgt_col)::UUID
        );
        RETURN OLD;
    END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 3b. Trigger genérico para FK (1:N en una columna de la propia entidad).
--     TG_ARGV = [code, row_type, fk_type, fk_col, dir]
--     dir = 'row_source' (la fila es origen) | 'row_target' (la fila es destino)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_rel_fk()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_code TEXT := TG_ARGV[0];
    v_row_type TEXT := TG_ARGV[1];
    v_fk_type TEXT := TG_ARGV[2];
    v_fk_col TEXT := TG_ARGV[3];
    v_dir TEXT := TG_ARGV[4];
    v_new_fk UUID := (to_jsonb(NEW) ->> v_fk_col)::UUID;
    v_old_fk UUID := CASE WHEN TG_OP = 'UPDATE' THEN (to_jsonb(OLD) ->> v_fk_col)::UUID END;
BEGIN
    -- En UPDATE que cambia la FK: retirar la arista anterior.
    IF TG_OP = 'UPDATE' AND v_new_fk IS DISTINCT FROM v_old_fk AND v_old_fk IS NOT NULL THEN
        IF v_dir = 'row_source' THEN
            PERFORM _rel_delete(v_row_type, OLD.id, v_code, v_fk_type, v_old_fk);
        ELSE
            PERFORM _rel_delete(v_fk_type, v_old_fk, v_code, v_row_type, OLD.id);
        END IF;
    END IF;

    IF v_new_fk IS NOT NULL THEN
        IF v_dir = 'row_source' THEN
            PERFORM _rel_upsert(v_row_type, NEW.id, v_code, v_fk_type, v_new_fk);
        ELSE
            PERFORM _rel_upsert(v_fk_type, v_new_fk, v_code, v_row_type, NEW.id);
        END IF;
    END IF;
    RETURN NEW;
END $$;


-- -----------------------------------------------------------------------------
-- 3c. Enganchar los triggers. (El borrado de una ENTIDAD ya lo limpia el trigger
--     cleanup_relationships_on_entity_delete; aquí cubrimos FKs y pivotes.)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS rel_lidera ON proyectos;
CREATE TRIGGER rel_lidera
    AFTER INSERT OR UPDATE OF agente_lider_id ON proyectos
    FOR EACH ROW EXECUTE FUNCTION trg_rel_fk('lidera', 'proyectos', 'agentes', 'agente_lider_id', 'row_target');

DROP TRIGGER IF EXISTS rel_enmarca ON innovaciones;
CREATE TRIGGER rel_enmarca
    AFTER INSERT OR UPDATE OF proyecto_id ON innovaciones
    FOR EACH ROW EXECUTE FUNCTION trg_rel_fk('enmarca_en', 'innovaciones', 'proyectos', 'proyecto_id', 'row_source');

DROP TRIGGER IF EXISTS rel_evidencia ON hallazgos;
CREATE TRIGGER rel_evidencia
    AFTER INSERT OR UPDATE OF innovacion_id ON hallazgos
    FOR EACH ROW EXECUTE FUNCTION trg_rel_fk('evidencia', 'hallazgos', 'innovaciones', 'innovacion_id', 'row_source');

DROP TRIGGER IF EXISTS rel_participa ON proyectos_agentes;
CREATE TRIGGER rel_participa
    AFTER INSERT OR DELETE ON proyectos_agentes
    FOR EACH ROW EXECUTE FUNCTION trg_rel_pivot('participa_en', 'agentes', 'agente_id', 'proyectos', 'proyecto_id');

DROP TRIGGER IF EXISTS rel_aborda ON innovaciones_retos;
CREATE TRIGGER rel_aborda
    AFTER INSERT OR DELETE ON innovaciones_retos
    FOR EACH ROW EXECUTE FUNCTION trg_rel_pivot('aborda', 'innovaciones', 'innovacion_id', 'retos', 'reto_id');

DROP TRIGGER IF EXISTS rel_contribuye ON retos_misiones;
CREATE TRIGGER rel_contribuye
    AFTER INSERT OR DELETE ON retos_misiones
    FOR EACH ROW EXECUTE FUNCTION trg_rel_pivot('contribuye_a', 'retos', 'reto_id', 'misiones', 'mision_id');

DROP TRIGGER IF EXISTS rel_se_basa ON recomendaciones_hallazgos;
CREATE TRIGGER rel_se_basa
    AFTER INSERT OR DELETE ON recomendaciones_hallazgos
    FOR EACH ROW EXECUTE FUNCTION trg_rel_pivot('se_basa_en', 'recomendaciones', 'recomendacion_id', 'hallazgos', 'hallazgo_id');


-- -----------------------------------------------------------------------------
-- 4. Backfill desde el estado actual (idempotente).
-- -----------------------------------------------------------------------------
INSERT INTO relationships (source_entity_type, source_entity_id, relationship_type_id, target_entity_type, target_entity_id)
SELECT 'agentes', p.agente_lider_id, rt.id, 'proyectos', p.id
FROM proyectos p JOIN relationship_types rt ON rt.code = 'lidera'
WHERE p.agente_lider_id IS NOT NULL
ON CONFLICT ON CONSTRAINT relationships_unique DO NOTHING;

INSERT INTO relationships (source_entity_type, source_entity_id, relationship_type_id, target_entity_type, target_entity_id)
SELECT 'agentes', pa.agente_id, rt.id, 'proyectos', pa.proyecto_id
FROM proyectos_agentes pa JOIN relationship_types rt ON rt.code = 'participa_en'
ON CONFLICT ON CONSTRAINT relationships_unique DO NOTHING;

INSERT INTO relationships (source_entity_type, source_entity_id, relationship_type_id, target_entity_type, target_entity_id)
SELECT 'innovaciones', i.id, rt.id, 'proyectos', i.proyecto_id
FROM innovaciones i JOIN relationship_types rt ON rt.code = 'enmarca_en'
WHERE i.proyecto_id IS NOT NULL
ON CONFLICT ON CONSTRAINT relationships_unique DO NOTHING;

INSERT INTO relationships (source_entity_type, source_entity_id, relationship_type_id, target_entity_type, target_entity_id)
SELECT 'innovaciones', ir.innovacion_id, rt.id, 'retos', ir.reto_id
FROM innovaciones_retos ir JOIN relationship_types rt ON rt.code = 'aborda'
ON CONFLICT ON CONSTRAINT relationships_unique DO NOTHING;

INSERT INTO relationships (source_entity_type, source_entity_id, relationship_type_id, target_entity_type, target_entity_id)
SELECT 'retos', rm.reto_id, rt.id, 'misiones', rm.mision_id
FROM retos_misiones rm JOIN relationship_types rt ON rt.code = 'contribuye_a'
ON CONFLICT ON CONSTRAINT relationships_unique DO NOTHING;

INSERT INTO relationships (source_entity_type, source_entity_id, relationship_type_id, target_entity_type, target_entity_id)
SELECT 'hallazgos', h.id, rt.id, 'innovaciones', h.innovacion_id
FROM hallazgos h JOIN relationship_types rt ON rt.code = 'evidencia'
WHERE h.innovacion_id IS NOT NULL
ON CONFLICT ON CONSTRAINT relationships_unique DO NOTHING;

INSERT INTO relationships (source_entity_type, source_entity_id, relationship_type_id, target_entity_type, target_entity_id)
SELECT 'recomendaciones', rh.recomendacion_id, rt.id, 'hallazgos', rh.hallazgo_id
FROM recomendaciones_hallazgos rh JOIN relationship_types rt ON rt.code = 'se_basa_en'
ON CONFLICT ON CONSTRAINT relationships_unique DO NOTHING;


NOTIFY pgrst, 'reload schema';
