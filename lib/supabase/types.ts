// Tipos manuales del modelo ECOS.
// Cuando puedas, regenera esto con:
//   pnpm types:gen   (usa supabase gen types typescript)
// Mientras tanto este archivo refleja el esquema en supabase/migrations.

export type EstadoProyecto = "diseno" | "activo" | "finalizado" | "escalado";
export type EstadoInnovacion =
  | "diseno"
  | "prototipo"
  | "implementacion"
  | "testeado"
  | "escalado";
export type NivelImpacto =
  | "comunitaria"
  | "local"
  | "autonomica"
  | "estatal"
  | "internacional";
export type TipoAgente =
  | "sociedad_civil"
  | "sector_publico"
  | "academia"
  | "sector_privado";
export type TipoTerritorio = "municipio" | "provincia" | "ccaa" | "estado";
export type NivelEvidencia =
  | "practica_documentada"
  | "datos_sistematicos"
  | "evaluacion_estructurada"
  | "evidencia_replicada";
export type AlcanceRecomendacion =
  | "local"
  | "provincial"
  | "autonomico"
  | "estatal"
  | "pluriautonomico";
export type EstadoRecomendacion =
  | "formulada"
  | "en_proceso"
  | "adoptada"
  | "descartada";

export interface Mision {
  id: string;
  external_id: string | null;
  nombre: string;
  descripcion: string | null;
  problema: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reto {
  id: string;
  external_id: string | null;
  nombre: string;
  descripcion: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agente {
  id: string;
  external_id: string | null;
  nombre: string;
  descripcion: string | null;
  email: string | null;
  tipo_agente: TipoAgente | null;
  sede_territorio_id: string | null;
  personas_implicadas: number | null;
  presupuesto: number | null;
  web: string | null;
  created_at: string;
  updated_at: string;
}

export interface Proyecto {
  id: string;
  external_id: string | null;
  nombre: string;
  descripcion: string | null;
  agente_lider_id: string;
  presupuesto: number | null;
  estado: EstadoProyecto | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  financiador: string | null;
  created_at: string;
  updated_at: string;
}

export interface Innovacion {
  id: string;
  external_id: string | null;
  nombre: string;
  descripcion: string | null;
  proyecto_id: string;
  estado: EstadoInnovacion | null;
  nivel_impacto: NivelImpacto | null;
  n_participantes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Hallazgo {
  id: string;
  external_id: string | null;
  titulo: string;
  descripcion: string;
  nivel_evidencia: NivelEvidencia | null;
  evidencia_cuantitativa: string | null;
  fuente: string | null;
  enlace: string | null;
  innovacion_id: string;
  validado: boolean;
  created_at: string;
  updated_at: string;
}

export interface Recomendacion {
  id: string;
  external_id: string | null;
  titulo: string;
  descripcion: string;
  ambito: string[] | null;
  destinatarios: string | null;
  alcance: AlcanceRecomendacion | null;
  estado: EstadoRecomendacion | null;
  created_at: string;
  updated_at: string;
}

export interface ImportLog {
  id: string;
  file_name: string | null;
  status: "processing" | "success" | "error";
  error_message: string | null;
  created_at: string;
}

// Fila de la tabla insights_history. El campo `insights` es JSONB y contiene
// el array de Insight (definido en lib/queries/insights.ts).
export interface InsightHistoryRow {
  id: string;
  mision_id: string;
  resumen: string | null;
  insights: unknown[];
  model: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  generated_by: string | null;
  created_at: string;
}

// Proyecto con su agente líder embebido (para listado y detalle)
export interface ProyectoConLider extends Proyecto {
  agente_lider: Pick<Agente, "id" | "nombre" | "email"> | null;
}

// Mantenemos el tipo extendido por si en el futuro re-incluimos socios
export interface ProyectoConRelaciones extends ProyectoConLider {
  socios: Pick<Agente, "id" | "nombre">[];
}

// Innovación con proyecto embebido (para listado y detalle)
export interface InnovacionConProyecto extends Innovacion {
  proyecto: Pick<Proyecto, "id" | "nombre"> | null;
}

export interface InnovacionConRelaciones extends InnovacionConProyecto {
  retos: Pick<Reto, "id" | "nombre">[];
}

// Reto con sus misiones vinculadas
export interface RetoConRelaciones extends Reto {
  misiones: Pick<Mision, "id" | "nombre">[];
}

// Hallazgo con la innovación a la que pertenece
export interface HallazgoConRelaciones extends Hallazgo {
  innovacion: Pick<Innovacion, "id" | "nombre"> | null;
}

// Recomendación con sus hallazgos vinculados
export interface RecomendacionConRelaciones extends Recomendacion {
  hallazgos: Pick<Hallazgo, "id" | "titulo">[];
}
