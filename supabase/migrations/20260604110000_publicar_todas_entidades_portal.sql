-- =============================================================================
-- Publicar todas las entidades del portal público
-- -----------------------------------------------------------------------------
-- `is_public` se añadió con DEFAULT false (migración 20260603205557), por lo que
-- todas las filas importadas nacieron privadas y el portal (/explorar) salía a 0.
-- Este backfill marca como públicas TODAS las filas existentes de las 5 entidades
-- explorables. Las filas futuras siguen naciendo privadas (default false): para
-- publicarlas habrá que marcarlas explícitamente.
--
-- Además, se RESTAURA el fix del trigger `validar_innovacion_hallazgo`: la
-- migración 20260408160000 (excel_schema_alignment) sobrescribió por error el fix
-- de 20260407225748 y quitó la guarda `NEW.estado IS DISTINCT FROM OLD.estado`.
-- Sin esa guarda, CUALQUIER update de una innovación ya en 'testeado'/'escalado'
-- sin hallazgo validado falla (rompe re-imports, ediciones y este backfill).
-- La regla de negocio correcta es "para PROMOVER a testeado/escalado debe haber
-- al menos un hallazgo validado", no "no se puede tocar nada después".
-- =============================================================================

-- 1) Restaurar el trigger con la guarda de cambio de estado (+ lógica estado_validacion).
CREATE OR REPLACE FUNCTION validar_innovacion_hallazgo()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo validar cuando el estado CAMBIA a uno que requiere evidencia.
    IF NEW.estado IN ('testeado', 'escalado')
       AND NEW.estado IS DISTINCT FROM OLD.estado THEN
        IF NOT EXISTS (
            SELECT 1 FROM hallazgos
            WHERE innovacion_id = NEW.id
              AND (estado_validacion = 'validado' OR validado = true)
        ) THEN
            RAISE EXCEPTION
                'La innovación debe tener al menos un hallazgo validado para pasar a estado %',
                NEW.estado;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Backfill: publicar todas las filas existentes de las 5 entidades del portal.
UPDATE public.misiones      SET is_public = true WHERE is_public = false;
UPDATE public.retos         SET is_public = true WHERE is_public = false;
UPDATE public.agentes       SET is_public = true WHERE is_public = false;
UPDATE public.proyectos     SET is_public = true WHERE is_public = false;
UPDATE public.innovaciones  SET is_public = true WHERE is_public = false;
