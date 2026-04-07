CREATE VIEW v_innovaciones_full AS
SELECT
    i.id,
    i.nombre,
    i.estado,
    i.nivel_impacto,
    i.proyecto_id,

    p.nombre AS proyecto_nombre,
    p.agente_lider_id,

    a.nombre AS agente_nombre,

    r.id AS reto_id,
    r.nombre AS reto_nombre,

    m.id AS mision_id,
    m.nombre AS mision_nombre

FROM innovaciones i
JOIN proyectos p ON p.id = i.proyecto_id
JOIN agentes a ON a.id = p.agente_lider_id
JOIN innovaciones_retos ir ON ir.innovacion_id = i.id
JOIN retos r ON r.id = ir.reto_id
JOIN retos_misiones rm ON rm.reto_id = r.id
JOIN misiones m ON m.id = rm.mision_id;

CREATE VIEW v_kpis_mision AS
SELECT
    m.id AS mision_id,
    m.nombre AS mision_nombre,

    COUNT(DISTINCT r.id) AS total_retos,
    COUNT(DISTINCT i.id) AS total_innovaciones,
    COUNT(DISTINCT p.id) AS total_proyectos,
    COUNT(DISTINCT a.id) AS total_agentes,
    COUNT(DISTINCT h.id) AS total_hallazgos,
    COUNT(DISTINCT rec.id) AS total_recomendaciones

FROM misiones m
LEFT JOIN retos_misiones rm ON rm.mision_id = m.id
LEFT JOIN retos r ON r.id = rm.reto_id
LEFT JOIN innovaciones_retos ir ON ir.reto_id = r.id
LEFT JOIN innovaciones i ON i.id = ir.innovacion_id
LEFT JOIN proyectos p ON p.id = i.proyecto_id
LEFT JOIN agentes a ON a.id = p.agente_lider_id
LEFT JOIN hallazgos h ON h.innovacion_id = i.id
LEFT JOIN recomendaciones_hallazgos rh ON rh.hallazgo_id = h.id
LEFT JOIN recomendaciones rec ON rec.id = rh.recomendacion_id

GROUP BY m.id, m.nombre;

CREATE VIEW v_cartera_innovacion AS
SELECT
    m.id AS mision_id,
    i.estado,
    i.nivel_impacto,
    COUNT(*) AS total

FROM v_innovaciones_full i
JOIN misiones m ON m.id = i.mision_id

GROUP BY m.id, i.estado, i.nivel_impacto;

CREATE VIEW v_cobertura_retos AS
SELECT
    m.id AS mision_id,
    r.id AS reto_id,
    r.nombre AS reto_nombre,
    COUNT(DISTINCT i.id) AS total_innovaciones

FROM retos r
JOIN retos_misiones rm ON rm.reto_id = r.id
JOIN misiones m ON m.id = rm.mision_id
LEFT JOIN innovaciones_retos ir ON ir.reto_id = r.id
LEFT JOIN innovaciones i ON i.id = ir.innovacion_id

GROUP BY m.id, r.id, r.nombre;

CREATE VIEW v_retos_sin_innovacion AS
SELECT *
FROM v_cobertura_retos
WHERE total_innovaciones = 0;

CREATE VIEW v_hallazgos_reto AS
SELECT
    m.id AS mision_id,
    r.id AS reto_id,
    r.nombre AS reto_nombre,

    h.id AS hallazgo_id,
    h.titulo,
    h.nivel_evidencia

FROM hallazgos h
JOIN innovaciones i ON i.id = h.innovacion_id
JOIN innovaciones_retos ir ON ir.innovacion_id = i.id
JOIN retos r ON r.id = ir.reto_id
JOIN retos_misiones rm ON rm.reto_id = r.id
JOIN misiones m ON m.id = rm.mision_id;

CREATE VIEW v_recomendaciones_mision AS
SELECT
    m.id AS mision_id,
    rec.id,
    rec.titulo,
    rec.estado,
    rec.alcance

FROM recomendaciones rec
JOIN recomendaciones_hallazgos rh ON rh.recomendacion_id = rec.id
JOIN hallazgos h ON h.id = rh.hallazgo_id
JOIN innovaciones i ON i.id = h.innovacion_id
JOIN innovaciones_retos ir ON ir.innovacion_id = i.id
JOIN retos r ON r.id = ir.reto_id
JOIN retos_misiones rm ON rm.reto_id = r.id
JOIN misiones m ON m.id = rm.mision_id;

CREATE VIEW v_agentes_mision AS
SELECT
    m.id AS mision_id,
    a.id AS agente_id,
    a.nombre,
    COUNT(DISTINCT p.id) AS total_proyectos

FROM agentes a
JOIN proyectos p ON p.agente_lider_id = a.id
JOIN innovaciones i ON i.proyecto_id = p.id
JOIN innovaciones_retos ir ON ir.innovacion_id = i.id
JOIN retos r ON r.id = ir.reto_id
JOIN retos_misiones rm ON rm.reto_id = r.id
JOIN misiones m ON m.id = rm.mision_id

GROUP BY m.id, a.id, a.nombre;

CREATE VIEW v_nivel_evidencia_mision AS
SELECT
    m.id AS mision_id,
    h.nivel_evidencia,
    COUNT(*) AS total

FROM hallazgos h
JOIN innovaciones i ON i.id = h.innovacion_id
JOIN innovaciones_retos ir ON ir.innovacion_id = i.id
JOIN retos r ON r.id = ir.reto_id
JOIN retos_misiones rm ON rm.reto_id = r.id
JOIN misiones m ON m.id = rm.mision_id

GROUP BY m.id, h.nivel_evidencia;

CREATE VIEW v_pipeline_madurez AS
SELECT
    m.id AS mision_id,
    i.estado,
    COUNT(*) AS total

FROM v_innovaciones_full i
JOIN misiones m ON m.id = i.mision_id

GROUP BY m.id, i.estado;

