-- =========================
-- EXTENSIONES
-- =========================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- TERRITORIOS
-- =========================

CREATE TABLE territorios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('municipio', 'provincia', 'ccaa', 'estado')),
    parent_id UUID REFERENCES territorios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- MISIONES
-- =========================

CREATE TABLE misiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    problema TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- =========================
-- RETOS
-- =========================

CREATE TABLE retos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- =========================
-- RETOS ↔ MISIONES
-- =========================

CREATE TABLE retos_misiones (
    reto_id UUID REFERENCES retos(id) ON DELETE CASCADE,
    mision_id UUID REFERENCES misiones(id) ON DELETE CASCADE,
    PRIMARY KEY (reto_id, mision_id)
);

-- =========================
-- AGENTES
-- =========================

CREATE TABLE agentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    email TEXT,
    tipo_agente TEXT CHECK (tipo_agente IN ('sociedad_civil', 'sector_publico', 'academia', 'sector_privado')),
    sede_territorio_id UUID REFERENCES territorios(id),
    personas_implicadas INTEGER,
    presupuesto NUMERIC,
    web TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- =========================
-- PROYECTOS
-- =========================

CREATE TABLE proyectos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    agente_lider_id UUID NOT NULL REFERENCES agentes(id),
    presupuesto NUMERIC,
    estado TEXT CHECK (estado IN ('diseno', 'activo', 'finalizado', 'escalado')),
    fecha_inicio DATE,
    fecha_fin DATE,
    financiador TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- =========================
-- PROYECTOS ↔ AGENTES (socios)
-- =========================

CREATE TABLE proyectos_agentes (
    proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
    agente_id UUID REFERENCES agentes(id) ON DELETE CASCADE,
    PRIMARY KEY (proyecto_id, agente_id)
);

-- =========================
-- INNOVACIONES
-- =========================

CREATE TABLE innovaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    estado TEXT CHECK (estado IN ('diseno', 'prototipo', 'implementacion', 'testeado', 'escalado')),
    nivel_impacto TEXT CHECK (nivel_impacto IN ('comunitaria', 'local', 'autonomica', 'estatal', 'internacional')),
    n_participantes TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- =========================
-- INNOVACIONES ↔ RETOS
-- =========================

CREATE TABLE innovaciones_retos (
    innovacion_id UUID REFERENCES innovaciones(id) ON DELETE CASCADE,
    reto_id UUID REFERENCES retos(id) ON DELETE CASCADE,
    PRIMARY KEY (innovacion_id, reto_id)
);

-- =========================
-- HALLAZGOS
-- =========================

CREATE TABLE hallazgos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    nivel_evidencia TEXT CHECK (
        nivel_evidencia IN (
            'practica_documentada',
            'datos_sistematicos',
            'evaluacion_estructurada',
            'evidencia_replicada'
        )
    ),
    evidencia_cuantitativa TEXT,
    fuente TEXT,
    enlace TEXT,
    innovacion_id UUID NOT NULL REFERENCES innovaciones(id) ON DELETE CASCADE,
    validado BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- =========================
-- RECOMENDACIONES
-- =========================

CREATE TABLE recomendaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    ambito TEXT[],
    destinatarios TEXT,
    alcance TEXT CHECK (alcance IN ('local', 'provincial', 'autonomico', 'estatal', 'pluriautonomico')),
    estado TEXT CHECK (estado IN ('formulada', 'en_proceso', 'adoptada', 'descartada')),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- =========================
-- RECOMENDACIONES ↔ HALLAZGOS
-- =========================

CREATE TABLE recomendaciones_hallazgos (
    recomendacion_id UUID REFERENCES recomendaciones(id) ON DELETE CASCADE,
    hallazgo_id UUID REFERENCES hallazgos(id) ON DELETE CASCADE,
    PRIMARY KEY (recomendacion_id, hallazgo_id)
);

-- =========================
-- IMPORT LOGS
-- =========================

CREATE TABLE import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT,
    status TEXT CHECK (status IN ('processing', 'success', 'error')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- PERFILES (ROLES)
-- =========================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('superadmin', 'user')) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT now()
);

-- =========================
-- FUNCIÓN UPDATED_AT
-- =========================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS updated_at

CREATE TRIGGER update_misiones BEFORE UPDATE ON misiones FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_retos BEFORE UPDATE ON retos FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_agentes BEFORE UPDATE ON agentes FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_proyectos BEFORE UPDATE ON proyectos FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_innovaciones BEFORE UPDATE ON innovaciones FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_hallazgos BEFORE UPDATE ON hallazgos FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_recomendaciones BEFORE UPDATE ON recomendaciones FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- =========================
-- VALIDACIÓN ECOS
-- =========================

CREATE OR REPLACE FUNCTION validar_innovacion_hallazgo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado IN ('testeado', 'escalado') THEN
        IF NOT EXISTS (
            SELECT 1 FROM hallazgos
            WHERE innovacion_id = NEW.id
            AND validado = true
        ) THEN
            RAISE EXCEPTION 'La innovación debe tener al menos un hallazgo validado';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_innovacion_hallazgo
BEFORE UPDATE ON innovaciones
FOR EACH ROW
EXECUTE FUNCTION validar_innovacion_hallazgo();

-- =========================
-- VISTA DERIVADA
-- =========================

CREATE VIEW proyectos_misiones AS
SELECT DISTINCT
    p.id AS proyecto_id,
    m.id AS mision_id,
    m.nombre AS mision_nombre
FROM proyectos p
JOIN innovaciones i ON i.proyecto_id = p.id
JOIN innovaciones_retos ir ON ir.innovacion_id = i.id
JOIN retos_misiones rm ON rm.reto_id = ir.reto_id
JOIN misiones m ON m.id = rm.mision_id;

-- =========================
-- ÍNDICES
-- =========================

CREATE INDEX idx_innovaciones_proyecto ON innovaciones(proyecto_id);
CREATE INDEX idx_hallazgos_innovacion ON hallazgos(innovacion_id);
CREATE INDEX idx_proyectos_agente ON proyectos(agente_lider_id);
