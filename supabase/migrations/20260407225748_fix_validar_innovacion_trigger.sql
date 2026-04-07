-- =============================================================================
-- Fix: el trigger validar_innovacion_hallazgo solo debe validar cuando el
-- estado CAMBIA a 'testeado' o 'escalado'. Antes se disparaba en cualquier
-- UPDATE de la innovación, lo que rompía:
--   - Re-imports idempotentes (upsert) cuando ya estaban testeadas.
--   - Cualquier edición de campos no relacionados con el estado.
--
-- La regla de negocio sigue siendo "para promover a testeado/escalado debe
-- haber al menos un hallazgo validado", no "no se puede tocar nada después".
-- =============================================================================

CREATE OR REPLACE FUNCTION validar_innovacion_hallazgo()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo validar cuando el estado CAMBIA a uno que requiere evidencia.
    -- Si el estado anterior ya era el mismo (o ya era testeado/escalado),
    -- permitir el UPDATE sin re-validar.
    IF NEW.estado IN ('testeado', 'escalado')
       AND NEW.estado IS DISTINCT FROM OLD.estado THEN
        IF NOT EXISTS (
            SELECT 1 FROM hallazgos
            WHERE innovacion_id = NEW.id
              AND validado = true
        ) THEN
            RAISE EXCEPTION
                'La innovación debe tener al menos un hallazgo validado para pasar a estado %',
                NEW.estado;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
