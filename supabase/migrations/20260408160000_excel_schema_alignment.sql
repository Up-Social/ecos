-- =========================
-- Alineación de esquema con Excel ECOS
-- =========================
--
-- Añade todas las columnas del Excel (hojas Misiones, Retos, Agentes,
-- Proyectos, Innovaciones, Hallazgos, Recomendaciones) a las tablas
-- correspondientes, y ajusta los CHECK constraints de los enums que
-- divergen de la hoja LISTAS.

-- -----------------------------------------------------------------------------
-- MISIONES
-- -----------------------------------------------------------------------------
ALTER TABLE misiones
    ADD COLUMN IF NOT EXISTS fuente_informacion TEXT,
    ADD COLUMN IF NOT EXISTS notas_internas TEXT;

-- -----------------------------------------------------------------------------
-- RETOS
-- -----------------------------------------------------------------------------
ALTER TABLE retos
    ADD COLUMN IF NOT EXISTS fuente_informacion TEXT;

-- -----------------------------------------------------------------------------
-- AGENTES
-- -----------------------------------------------------------------------------
ALTER TABLE agentes
    ADD COLUMN IF NOT EXISTS municipio_sede TEXT,
    ADD COLUMN IF NOT EXISTS rol_ecosistema TEXT[],
    ADD COLUMN IF NOT EXISTS grupos_poblacion TEXT[],
    ADD COLUMN IF NOT EXISTS interconexiones_ids TEXT,
    ADD COLUMN IF NOT EXISTS fuente_informacion TEXT;

-- -----------------------------------------------------------------------------
-- PROYECTOS
-- -----------------------------------------------------------------------------
ALTER TABLE proyectos
    ADD COLUMN IF NOT EXISTS grupos_poblacion TEXT[],
    ADD COLUMN IF NOT EXISTS ccaa TEXT,
    ADD COLUMN IF NOT EXISTS enlace_1 TEXT;

-- Fix estado_proyecto: LISTAS usa "en_diseno" (el init usaba "diseno")
ALTER TABLE proyectos DROP CONSTRAINT IF EXISTS proyectos_estado_check;
-- Migrar los valores existentes (si los hubiera) antes de aplicar nuevo CHECK
UPDATE proyectos SET estado = 'en_diseno' WHERE estado = 'diseno';
ALTER TABLE proyectos
    ADD CONSTRAINT proyectos_estado_check
    CHECK (estado IN ('en_diseno', 'activo', 'finalizado', 'escalado'));

-- -----------------------------------------------------------------------------
-- INNOVACIONES
-- -----------------------------------------------------------------------------
ALTER TABLE innovaciones
    ADD COLUMN IF NOT EXISTS grupos_poblacion TEXT[],
    ADD COLUMN IF NOT EXISTS opciones_escalado TEXT[],
    ADD COLUMN IF NOT EXISTS enlace_referencia TEXT;

-- n_participantes ya existe como TEXT; añadimos CHECK con los valores de LISTAS.
-- Primero normalizamos los valores antiguos que no encajen (se pondrán a NULL).
ALTER TABLE innovaciones DROP CONSTRAINT IF EXISTS innovaciones_n_participantes_check;
UPDATE innovaciones
    SET n_participantes = NULL
    WHERE n_participantes IS NOT NULL
      AND n_participantes NOT IN ('1-10', '11-50', '51-200', '201-1000', 'mas_de_1000');
ALTER TABLE innovaciones
    ADD CONSTRAINT innovaciones_n_participantes_check
    CHECK (
        n_participantes IS NULL OR
        n_participantes IN ('1-10', '11-50', '51-200', '201-1000', 'mas_de_1000')
    );

-- -----------------------------------------------------------------------------
-- HALLAZGOS
-- -----------------------------------------------------------------------------
ALTER TABLE hallazgos
    ADD COLUMN IF NOT EXISTS estado_validacion TEXT
    CHECK (
        estado_validacion IS NULL OR
        estado_validacion IN ('propuesto', 'validado', 'rechazado')
    );

-- Sincronizar estado_validacion con el boolean `validado` existente por compatibilidad
UPDATE hallazgos SET estado_validacion = 'validado' WHERE validado = true;
UPDATE hallazgos SET estado_validacion = 'propuesto'
    WHERE estado_validacion IS NULL AND validado = false;

-- Actualizar el trigger de validación de innovaciones para usar estado_validacion
CREATE OR REPLACE FUNCTION validar_innovacion_hallazgo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado IN ('testeado', 'escalado') THEN
        IF NOT EXISTS (
            SELECT 1 FROM hallazgos
            WHERE innovacion_id = NEW.id
            AND (estado_validacion = 'validado' OR validado = true)
        ) THEN
            RAISE EXCEPTION 'La innovación debe tener al menos un hallazgo validado';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- RECOMENDACIONES
-- -----------------------------------------------------------------------------
-- Fix estado: LISTAS usa "en_proceso_adopcion" (el init usaba "en_proceso")
ALTER TABLE recomendaciones DROP CONSTRAINT IF EXISTS recomendaciones_estado_check;
UPDATE recomendaciones SET estado = 'en_proceso_adopcion' WHERE estado = 'en_proceso';
ALTER TABLE recomendaciones
    ADD CONSTRAINT recomendaciones_estado_check
    CHECK (estado IN ('formulada', 'en_proceso_adopcion', 'adoptada', 'descartada'));

-- ambito ya es TEXT[] y acepta cualquier valor; no se restringe con CHECK
-- porque PostgreSQL no permite CHECK sobre elementos de array sin trigger.
-- La validación se hace en el frontend/backend usando los valores de LISTAS.

-- Recargar el schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
