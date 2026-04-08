// =============================================================================
// Enums y listas controladas del Excel ECOS (hoja LISTAS).
// Fuente única de verdad para schemas zod, selects de formularios y validación
// en la Edge Function de import. Si cambia la hoja LISTAS del Excel, actualiza
// también este fichero para mantenerlos sincronizados.
// =============================================================================

export const TIPO_AGENTE = [
  "sociedad_civil",
  "sector_publico",
  "academia",
  "sector_privado",
] as const;
export type TipoAgente = (typeof TIPO_AGENTE)[number];

export const TIPO_AGENTE_LABELS: Record<TipoAgente, string> = {
  sociedad_civil: "Sociedad civil",
  sector_publico: "Sector público",
  academia: "Academia",
  sector_privado: "Sector privado",
};

export const ROL_ECOSISTEMA = [
  "financia",
  "diseña",
  "implementa",
  "investiga",
  "coordina",
  "evalúa",
  "acompaña",
  "regula",
] as const;
export type RolEcosistema = (typeof ROL_ECOSISTEMA)[number];

export const GRUPOS_POBLACION = [
  "infancia",
  "adolescencia",
  "jovenes",
  "personas_mayores",
  "migrantes",
  "personas_discapacidad",
  "familias",
  "personas_sin_hogar",
  "mujeres",
  "otros",
] as const;
export type GrupoPoblacion = (typeof GRUPOS_POBLACION)[number];

export const GRUPOS_POBLACION_LABELS: Record<GrupoPoblacion, string> = {
  infancia: "Infancia",
  adolescencia: "Adolescencia",
  jovenes: "Jóvenes",
  personas_mayores: "Personas mayores",
  migrantes: "Migrantes",
  personas_discapacidad: "Personas con discapacidad",
  familias: "Familias",
  personas_sin_hogar: "Personas sin hogar",
  mujeres: "Mujeres",
  otros: "Otros",
};

export const ESTADO_PROYECTO = [
  "en_diseno",
  "activo",
  "finalizado",
  "escalado",
] as const;
export type EstadoProyecto = (typeof ESTADO_PROYECTO)[number];

export const ESTADO_PROYECTO_LABELS: Record<EstadoProyecto, string> = {
  en_diseno: "En diseño",
  activo: "Activo",
  finalizado: "Finalizado",
  escalado: "Escalado",
};

export const ESTADO_EXPERIMENTACION = [
  "diseno",
  "prototipo",
  "implementacion",
  "testeado",
  "escalado",
] as const;
export type EstadoExperimentacion = (typeof ESTADO_EXPERIMENTACION)[number];

export const ESTADO_EXPERIMENTACION_LABELS: Record<EstadoExperimentacion, string> = {
  diseno: "Diseño",
  prototipo: "Prototipo",
  implementacion: "Implementación",
  testeado: "Testeado",
  escalado: "Escalado",
};

export const NIVEL_IMPACTO = [
  "comunitaria",
  "local",
  "autonomica",
  "estatal",
  "internacional",
] as const;
export type NivelImpacto = (typeof NIVEL_IMPACTO)[number];

export const NIVEL_IMPACTO_LABELS: Record<NivelImpacto, string> = {
  comunitaria: "Comunitaria",
  local: "Local",
  autonomica: "Autonómica",
  estatal: "Estatal",
  internacional: "Internacional",
};

export const RANGO_PARTICIPANTES = [
  "1-10",
  "11-50",
  "51-200",
  "201-1000",
  "mas_de_1000",
] as const;
export type RangoParticipantes = (typeof RANGO_PARTICIPANTES)[number];

export const RANGO_PARTICIPANTES_LABELS: Record<RangoParticipantes, string> = {
  "1-10": "1-10",
  "11-50": "11-50",
  "51-200": "51-200",
  "201-1000": "201-1000",
  mas_de_1000: "Más de 1000",
};

export const NIVEL_EVIDENCIA = [
  "practica_documentada",
  "datos_sistematicos",
  "evaluacion_estructurada",
  "evidencia_replicada",
] as const;
export type NivelEvidencia = (typeof NIVEL_EVIDENCIA)[number];

export const NIVEL_EVIDENCIA_LABELS: Record<NivelEvidencia, string> = {
  practica_documentada: "Práctica documentada",
  datos_sistematicos: "Datos sistemáticos",
  evaluacion_estructurada: "Evaluación estructurada",
  evidencia_replicada: "Evidencia replicada",
};

export const ESTADO_VALIDACION = ["propuesto", "validado", "rechazado"] as const;
export type EstadoValidacion = (typeof ESTADO_VALIDACION)[number];

export const ESTADO_VALIDACION_LABELS: Record<EstadoValidacion, string> = {
  propuesto: "Propuesto",
  validado: "Validado",
  rechazado: "Rechazado",
};

export const ESTADO_RECOMENDACION = [
  "formulada",
  "en_proceso_adopcion",
  "adoptada",
  "descartada",
] as const;
export type EstadoRecomendacion = (typeof ESTADO_RECOMENDACION)[number];

export const ESTADO_RECOMENDACION_LABELS: Record<EstadoRecomendacion, string> = {
  formulada: "Formulada",
  en_proceso_adopcion: "En proceso de adopción",
  adoptada: "Adoptada",
  descartada: "Descartada",
};

export const AMBITO_RECOMENDACION = [
  "normativo",
  "financiero",
  "organizativo",
  "programatico",
  "cultural",
] as const;
export type AmbitoRecomendacion = (typeof AMBITO_RECOMENDACION)[number];

export const AMBITO_RECOMENDACION_LABELS: Record<AmbitoRecomendacion, string> = {
  normativo: "Normativo",
  financiero: "Financiero",
  organizativo: "Organizativo",
  programatico: "Programático",
  cultural: "Cultural",
};

export const ALCANCE_TERRITORIAL = [
  "local",
  "provincial",
  "autonomico",
  "pluriautonomico",
  "estatal",
] as const;
export type AlcanceTerritorial = (typeof ALCANCE_TERRITORIAL)[number];

export const ALCANCE_TERRITORIAL_LABELS: Record<AlcanceTerritorial, string> = {
  local: "Local",
  provincial: "Provincial",
  autonomico: "Autonómico",
  pluriautonomico: "Pluriautonómico",
  estatal: "Estatal",
};

export const OPCIONES_ESCALADO = [
  "replicacion_territorial",
  "ampliacion_poblacion",
  "integracion_politica_existente",
  "generacion_nueva_politica",
  "consolidacion_organizativa",
  "transferencia_otros_sectores",
] as const;
export type OpcionEscalado = (typeof OPCIONES_ESCALADO)[number];

export const OPCIONES_ESCALADO_LABELS: Record<OpcionEscalado, string> = {
  replicacion_territorial: "Replicación territorial",
  ampliacion_poblacion: "Ampliación de población",
  integracion_politica_existente: "Integración en política pública existente",
  generacion_nueva_politica: "Generación de nueva política pública",
  consolidacion_organizativa: "Consolidación organizativa",
  transferencia_otros_sectores: "Transferencia a otros sectores",
};

// Helper: convierte una lista de keys en las options típicas del <Select>
export function toOptions<T extends string>(
  keys: readonly T[],
  labels: Record<T, string>,
): { value: T; label: string }[] {
  return keys.map((k) => ({ value: k, label: labels[k] }));
}
