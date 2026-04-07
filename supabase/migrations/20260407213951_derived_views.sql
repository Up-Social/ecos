-- =============================================================================
-- Vistas derivadas que reflejan la lógica ECOS:
--
--   PROYECTO  ─►  innovaciones  ─►  retos  ─►  misiones
--
-- proyectos_retos        : todos los retos vinculados a un proyecto vía sus
--                          innovaciones (DISTINCT)
-- innovaciones_misiones  : todas las misiones vinculadas a una innovación
--                          vía sus retos (DISTINCT)
--
-- La vista 'proyectos_misiones' ya existe en la migración inicial.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- proyectos_retos
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW proyectos_retos AS
SELECT DISTINCT
    p.id   AS proyecto_id,
    r.id   AS reto_id,
    r.nombre AS reto_nombre
FROM proyectos p
JOIN innovaciones i        ON i.proyecto_id = p.id
JOIN innovaciones_retos ir ON ir.innovacion_id = i.id
JOIN retos r               ON r.id = ir.reto_id;

-- -----------------------------------------------------------------------------
-- innovaciones_misiones
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW innovaciones_misiones AS
SELECT DISTINCT
    i.id   AS innovacion_id,
    m.id   AS mision_id,
    m.nombre AS mision_nombre
FROM innovaciones i
JOIN innovaciones_retos ir ON ir.innovacion_id = i.id
JOIN retos_misiones rm     ON rm.reto_id = ir.reto_id
JOIN misiones m            ON m.id = rm.mision_id;
