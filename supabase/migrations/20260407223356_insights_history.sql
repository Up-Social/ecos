-- =============================================================================
-- Tabla `insights_history`: persistencia de los análisis de IA generados
-- por Claude. Cada fila es una ejecución completa del endpoint /api/insights
-- para una misión.
--
-- Actúa también como caché: el cliente carga la fila más reciente al abrir
-- el dashboard sin volver a consumir tokens de Anthropic.
-- =============================================================================

CREATE TABLE insights_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mision_id UUID NOT NULL REFERENCES misiones(id) ON DELETE CASCADE,

    -- Output de Claude
    resumen TEXT,
    insights JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Metadatos de la generación (para tracking de coste)
    model TEXT,
    tokens_input INT,
    tokens_output INT,

    -- Auditoría
    generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para la query principal: "última lectura por misión"
CREATE INDEX idx_insights_history_mision_created
    ON insights_history(mision_id, created_at DESC);

ALTER TABLE insights_history ENABLE ROW LEVEL SECURITY;
