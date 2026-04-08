// =============================================================================
// Supabase Edge Function: import-excel
//
// Importa el Excel ECOS prototipo (formato `ECOS_bbdd_prototipo_*.xlsx`).
//
// Características:
//   - Detecta hojas por nombre con tolerancia a emojis y mayúsculas.
//   - Detecta automáticamente la fila de cabecera (busca primera celda
//     que empiece por "ID_").
//   - Usa external_id como clave natural y hace UPSERT, así re-importar el
//     mismo Excel no duplica filas.
//   - Resuelve FKs por external_id (M001, R001, A001, P001, I001, ...).
//   - Caso especial: proyecto.lider puede venir como ID o como nombre →
//     se intenta resolver de las dos formas, y si no existe se crea un
//     stub de agente.
//   - Normaliza enums (Finalizado → finalizado, Tercer sector → sociedad_civil,
//     autonómica → autonomica, etc.).
//   - dry_run: solo cuenta filas no vacías, no escribe nada en BD.
// =============================================================================

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

// -----------------------------------------------------------------------------
// CORS
// -----------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// -----------------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------------

type Row = Record<string, unknown>;

interface ImportSummary {
  [key: string]: { found: number; written: number; skipped: number };
}

// -----------------------------------------------------------------------------
// Helpers de strings y normalización
// -----------------------------------------------------------------------------

/** Quita acentos y pasa a lowercase para comparar nombres de hoja/valores. */
function normKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Devuelve la primera hoja cuyo nombre normalizado contiene `needle`. */
function findSheet(wb: XLSX.WorkBook, needle: string): string | null {
  const target = normKey(needle);
  for (const name of wb.SheetNames) {
    if (normKey(name).includes(target)) return name;
  }
  return null;
}

/** Convierte la matriz cruda de una hoja en objetos con cabeceras detectadas. */
function readSheet(wb: XLSX.WorkBook, sheetName: string): Row[] {
  const sheet = wb.Sheets[sheetName];
  // header: 1 → devuelve array de arrays (sin asumir cabecera)
  const matrix: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });
  if (matrix.length === 0) return [];

  // Detectar la fila de cabeceras: la primera donde la celda 0 empieza por "ID_"
  let headerIdx = matrix.findIndex(
    (row) => typeof row[0] === "string" && (row[0] as string).startsWith("ID_"),
  );
  if (headerIdx < 0) {
    // Fallback: primera fila con ≥3 cells no nulas
    headerIdx = matrix.findIndex(
      (row) => row.filter((c) => c !== null && c !== "").length >= 3,
    );
  }
  if (headerIdx < 0) return [];

  const headers = (matrix[headerIdx] ?? []).map((h) =>
    typeof h === "string" ? h.trim() : "",
  );

  const rows: Row[] = [];
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const raw = matrix[i] ?? [];
    if (raw.every((c) => c === null || c === "")) continue;
    const obj: Row = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (!key) continue;
      let val: unknown = raw[c];
      if (typeof val === "string") {
        val = val.trim();
        if (val === "") val = null;
      }
      obj[key] = val ?? null;
    }
    // Solo añadir filas con un ID
    const idKey = Object.keys(obj).find((k) => k.startsWith("ID_"));
    if (idKey && obj[idKey]) rows.push(obj);
  }
  return rows;
}

// -----------------------------------------------------------------------------
// Conversores y normalizadores
// -----------------------------------------------------------------------------

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toBool(v: unknown, truthy: string[] = ["true", "1", "si", "sí", "yes", "validado"]): boolean {
  if (v === true || v === 1) return true;
  if (typeof v === "string") {
    return truthy.includes(v.trim().toLowerCase());
  }
  return false;
}

/** Convierte un año (2022) o fecha completa en string ISO. start = 01-01, end = 12-31. */
function toDate(v: unknown, mode: "start" | "end" = "start"): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    if (v >= 1900 && v <= 2200) {
      return mode === "start" ? `${v}-01-01` : `${v}-12-31`;
    }
    return null;
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (/^\d{4}$/.test(trimmed)) {
      const y = Number(trimmed);
      return mode === "start" ? `${y}-01-01` : `${y}-12-31`;
    }
    // Si parece ISO ya, devolver tal cual
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

/** Split flexible para listas separadas por |, /, ; o saltos de línea. */
function splitList(v: unknown): string[] {
  if (v === null || v === undefined || v === "") return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v)
    .split(/[|/;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Como splitList pero también separa por " y " (para listas tipo "A013 y A014"). */
function splitListWithY(v: unknown): string[] {
  if (v === null || v === undefined || v === "") return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v)
    .split(/[|/;\n]+|\s+y\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// -----------------------------------------------------------------------------
// Mapeo de enums (valores del Excel → valores del esquema)
// -----------------------------------------------------------------------------

const TIPO_AGENTE_MAP: Record<string, string> = {
  "tercer sector": "sociedad_civil",
  "sociedad civil": "sociedad_civil",
  "sociedad_civil": "sociedad_civil",
  "sector publico": "sector_publico",
  "sector público": "sector_publico",
  "sector_publico": "sector_publico",
  "academia": "academia",
  "organizacion cientifica": "academia",
  "organización científica": "academia",
  "sector privado": "sector_privado",
  "sector_privado": "sector_privado",
};

const ESTADO_PROYECTO_MAP: Record<string, string> = {
  "diseño": "en_diseno",
  "diseno": "en_diseno",
  "en diseño": "en_diseno",
  "en_diseno": "en_diseno",
  "activo": "activo",
  "finalizado": "finalizado",
  "escalado": "escalado",
};

const ESTADO_INNOVACION_MAP: Record<string, string> = {
  "diseño": "diseno",
  "diseno": "diseno",
  "prototipo": "prototipo",
  "implementación": "implementacion",
  "implementacion": "implementacion",
  "testeado": "testeado",
  "escalado": "escalado",
};

const NIVEL_IMPACTO_MAP: Record<string, string> = {
  "comunitaria": "comunitaria",
  "local": "local",
  "autonómica": "autonomica",
  "autonomica": "autonomica",
  "estatal": "estatal",
  "internacional": "internacional",
};

const NIVEL_EVIDENCIA_MAP: Record<string, string> = {
  "practica documentada": "practica_documentada",
  "práctica documentada": "practica_documentada",
  "practica_documentada": "practica_documentada",
  "datos sistematicos": "datos_sistematicos",
  "datos sistemáticos": "datos_sistematicos",
  "datos_sistematicos": "datos_sistematicos",
  "evaluacion estructurada": "evaluacion_estructurada",
  "evaluación estructurada": "evaluacion_estructurada",
  "evaluacion_estructurada": "evaluacion_estructurada",
  "evidencia replicada": "evidencia_replicada",
  "evidencia_replicada": "evidencia_replicada",
};

const ALCANCE_RECOMENDACION_MAP: Record<string, string> = {
  "local": "local",
  "provincial": "provincial",
  "autonómico": "autonomico",
  "autonomico": "autonomico",
  "estatal": "estatal",
  "pluriautonómico": "pluriautonomico",
  "pluriautonomico": "pluriautonomico",
};

const ESTADO_RECOMENDACION_MAP: Record<string, string> = {
  "formulada": "formulada",
  "en proceso": "en_proceso_adopcion",
  "en_proceso": "en_proceso_adopcion",
  "en proceso de adopcion": "en_proceso_adopcion",
  "en proceso de adopción": "en_proceso_adopcion",
  "en_proceso_adopcion": "en_proceso_adopcion",
  "adoptada": "adoptada",
  "descartada": "descartada",
};

// Enums adicionales de LISTAS
const ROL_ECOSISTEMA_VALUES = new Set([
  "financia", "diseña", "implementa", "investiga",
  "coordina", "evalúa", "acompaña", "regula",
]);

const GRUPOS_POBLACION_VALUES = new Set([
  "infancia", "adolescencia", "jovenes", "personas_mayores",
  "migrantes", "personas_discapacidad", "familias",
  "personas_sin_hogar", "mujeres", "otros",
]);

/** Mapa de etiquetas descriptivas del Excel → keys canónicas para grupos_poblacion.
 *  Una entrada del mapa puede devolver varias keys (ej. "infancia y juventud" → ambas). */
const GRUPOS_POBLACION_LABEL_MAP: Record<string, string[]> = {
  "infancia": ["infancia"],
  "adolescencia": ["adolescencia"],
  "infancia y adolescencia": ["infancia", "adolescencia"],
  "infancia y juventud": ["infancia", "jovenes"],
  "infancia, adolescencia y juventud": ["infancia", "adolescencia", "jovenes"],
  "jovenes": ["jovenes"],
  "jóvenes": ["jovenes"],
  "personas mayores": ["personas_mayores"],
  "mayores": ["personas_mayores"],
  "migrantes": ["migrantes"],
  "personas con discapacidad": ["personas_discapacidad"],
  "personas con discapacidad fisica y organica": ["personas_discapacidad"],
  "personas con discapacidad física y orgánica": ["personas_discapacidad"],
  "personas con discapacidad intelectual y del desarrollo": ["personas_discapacidad"],
  "personas con discapacidad intelectual": ["personas_discapacidad"],
  "familias": ["familias"],
  "personas sin hogar": ["personas_sin_hogar"],
  "sinhogarismo": ["personas_sin_hogar"],
  "personas en situacion de sinhogarismo": ["personas_sin_hogar"],
  "personas en situación de sinhogarismo": ["personas_sin_hogar"],
  "mujeres": ["mujeres"],
  "transversal": ["otros"],
  "transcersal": ["otros"], // typo presente en el Excel
};

/** Mapa de etiquetas descriptivas del Excel → keys canónicas para rol_ecosistema. */
const ROL_ECOSISTEMA_LABEL_MAP: Record<string, string> = {
  "financia": "financia",
  "diseña": "diseña",
  "disena": "diseña",
  "implementa": "implementa",
  "investiga": "investiga",
  "coordina": "coordina",
  "evalua": "evalúa",
  "evalúa": "evalúa",
  "acompaña": "acompaña",
  "acompana": "acompaña",
  "regula": "regula",
};

/** Resuelve grupos_poblacion del Excel devolviendo el array de keys canónicas. */
function resolveGruposPoblacion(value: unknown): string[] {
  const out = new Set<string>();
  for (const token of splitList(value)) {
    const key = normKey(token);
    const mapped = GRUPOS_POBLACION_LABEL_MAP[key];
    if (mapped) {
      mapped.forEach((k) => out.add(k));
    } else if (GRUPOS_POBLACION_VALUES.has(key)) {
      out.add(key);
    }
  }
  return Array.from(out);
}

/** Resuelve rol_ecosistema del Excel devolviendo el array de keys canónicas. */
function resolveRolesEcosistema(value: unknown): string[] {
  const out = new Set<string>();
  for (const token of splitList(value)) {
    const key = normKey(token);
    const mapped = ROL_ECOSISTEMA_LABEL_MAP[key];
    if (mapped) out.add(mapped);
    else if (ROL_ECOSISTEMA_VALUES.has(key)) out.add(key);
  }
  return Array.from(out);
}

const RANGO_PARTICIPANTES_VALUES = new Set([
  "1-10", "11-50", "51-200", "201-1000", "mas_de_1000",
]);

const ESTADO_VALIDACION_MAP: Record<string, string> = {
  "propuesto": "propuesto",
  "validado": "validado",
  "rechazado": "rechazado",
};

const AMBITO_RECOMENDACION_VALUES = new Set([
  "normativo", "financiero", "organizativo", "programatico", "cultural",
]);

/** Mapa de valores del Excel (ej. "Replicacion territorial") → keys de BD */
const OPCIONES_ESCALADO_MAP: Record<string, string> = {
  "replicacion territorial": "replicacion_territorial",
  "replicación territorial": "replicacion_territorial",
  "ampliacion de poblacion": "ampliacion_poblacion",
  "ampliación de población": "ampliacion_poblacion",
  "integracion en politica publica existente": "integracion_politica_existente",
  "integración en política pública existente": "integracion_politica_existente",
  "generacion de nueva politica publica": "generacion_nueva_politica",
  "generación de nueva política pública": "generacion_nueva_politica",
  "consolidacion organizativa": "consolidacion_organizativa",
  "consolidación organizativa": "consolidacion_organizativa",
  "transferencia a otros sectores": "transferencia_otros_sectores",
};

/** Filtra un array de tokens manteniendo solo los que estén en el set permitido. */
function filterEnum(values: string[], allowed: Set<string>): string[] {
  return values
    .map((v) => v.trim())
    .filter((v) => allowed.has(v));
}

/** Mapea una lista de tokens a sus keys canónicas usando un map; ignora los no mapeados. */
function mapEnumList(values: string[], map: Record<string, string>): string[] {
  const out: string[] = [];
  for (const v of values) {
    const key = map[normKey(v)];
    if (key) out.push(key);
  }
  return Array.from(new Set(out));
}

function mapEnum(
  value: unknown,
  map: Record<string, string>,
): string | null {
  const s = toStr(value);
  if (!s) return null;
  return map[normKey(s)] ?? null;
}

// -----------------------------------------------------------------------------
// Comparación de filas para detectar modificaciones vs estado en BD.
// -----------------------------------------------------------------------------

/** Normaliza un valor para comparación: null, undefined y "" → null. */
function normalizeForCompare(v: unknown): unknown {
  if (v === null || v === undefined || v === "") return null;
  if (Array.isArray(v)) {
    const arr = v.map((x) => (typeof x === "string" ? x.trim() : x))
      .filter((x) => x !== null && x !== "");
    return arr.length === 0 ? null : [...arr].sort();
  }
  if (typeof v === "string") return v.trim();
  return v;
}

/** Compara dos valores de fila considerando arrays, números y strings. */
function valuesEqual(a: unknown, b: unknown): boolean {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (na === null && nb === null) return true;
  if (na === null || nb === null) return false;
  if (Array.isArray(na) && Array.isArray(nb)) {
    if (na.length !== nb.length) return false;
    return na.every((v, i) => v === (nb as unknown[])[i]);
  }
  // Boolean comparison
  if (typeof na === "boolean" || typeof nb === "boolean") {
    return Boolean(na) === Boolean(nb);
  }
  // Number comparison
  if (typeof na === "number" || typeof nb === "number") {
    const numA = Number(na);
    const numB = Number(nb);
    if (Number.isFinite(numA) && Number.isFinite(numB)) {
      return numA === numB;
    }
  }
  return String(na) === String(nb);
}

/** Compara una fila candidata con la existente en BD para los campos dados. */
function rowsEqual(
  existing: Record<string, unknown>,
  candidate: Record<string, unknown>,
  fields: string[],
): boolean {
  for (const f of fields) {
    if (!valuesEqual(existing[f], candidate[f])) return false;
  }
  return true;
}

/** Diferencias entre dos filas: devuelve los nombres de campo modificados. */
function diffFields(
  existing: Record<string, unknown>,
  candidate: Record<string, unknown>,
  fields: string[],
): string[] {
  return fields.filter((f) => !valuesEqual(existing[f], candidate[f]));
}

// Campos de identidad usados para detectar si una fila ha sido modificada.
// No incluyen FKs (las resolvemos por nombre/external_id) ni relaciones M:N
// (se reconstruyen siempre).
const COMPARE_FIELDS: Record<string, string[]> = {
  misiones: ["nombre", "descripcion", "problema", "fuente_informacion", "notas_internas"],
  retos: ["nombre", "descripcion", "fuente_informacion"],
  agentes: [
    "nombre", "descripcion", "email", "tipo_agente", "municipio_sede",
    "rol_ecosistema", "grupos_poblacion", "web", "personas_implicadas",
    "presupuesto", "interconexiones_ids", "fuente_informacion",
  ],
  proyectos: [
    "nombre", "descripcion", "estado", "financiador",
    "grupos_poblacion", "ccaa", "enlace_1",
  ],
  innovaciones: [
    "nombre", "descripcion", "estado", "nivel_impacto",
    "n_participantes", "grupos_poblacion", "opciones_escalado", "enlace_referencia",
  ],
  hallazgos: [
    "titulo", "descripcion", "nivel_evidencia", "evidencia_cuantitativa",
    "fuente", "enlace", "estado_validacion",
  ],
  recomendaciones: [
    "titulo", "descripcion", "ambito", "destinatarios", "alcance", "estado",
  ],
};

// -----------------------------------------------------------------------------
// Tipos de validación
// -----------------------------------------------------------------------------

type RowOutcome = "new" | "skip" | "conflict";

interface ValidationError {
  sheet: string;
  row?: number;
  external_id?: string;
  type: "duplicate_id" | "duplicate_name" | "modified" | "missing_id" | "fk_missing";
  message: string;
  diff?: string[];
}

interface SheetValidation<T extends Record<string, unknown>> {
  table: string;
  candidates: T[]; // filas construidas para insertar o comparar
  outcomes: RowOutcome[]; // por índice de candidates
  existing: Map<string, Record<string, unknown>>; // external_id → row de BD
  errors: ValidationError[];
}

/** Detecta duplicados intra-sheet por external_id o por un campo identificador (nombre/titulo). */
function detectIntraSheetDuplicates<T extends Record<string, unknown>>(
  sheet: string,
  candidates: T[],
  nameField: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenIds = new Map<string, number>();
  const seenNames = new Map<string, number>();
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const ext = c.external_id ? String(c.external_id) : null;
    const name = c[nameField] ? String(c[nameField]).trim() : null;

    if (ext) {
      if (seenIds.has(ext)) {
        errors.push({
          sheet,
          row: i + 2, // +2 por cabecera (row 1 + 0-index)
          external_id: ext,
          type: "duplicate_id",
          message: `ID "${ext}" duplicado en la hoja (también en fila ${seenIds.get(ext)! + 2}).`,
        });
      } else {
        seenIds.set(ext, i);
      }
    }

    if (name) {
      const nameKey = normKey(name);
      if (seenNames.has(nameKey)) {
        errors.push({
          sheet,
          row: i + 2,
          external_id: ext ?? undefined,
          type: "duplicate_name",
          message: `${nameField === "titulo" ? "Título" : "Nombre"} "${name}" duplicado en la hoja (también en fila ${seenNames.get(nameKey)! + 2}).`,
        });
      } else {
        seenNames.set(nameKey, i);
      }
    }
  }
  return errors;
}

/** Clasifica cada candidata como new/skip/conflict comparando con la BD existente. */
function classifyAgainstDb<T extends Record<string, unknown>>(
  sheet: string,
  table: string,
  candidates: T[],
  existing: Map<string, Record<string, unknown>>,
): { outcomes: RowOutcome[]; errors: ValidationError[] } {
  const fields = COMPARE_FIELDS[table] ?? [];
  const outcomes: RowOutcome[] = [];
  const errors: ValidationError[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const ext = c.external_id ? String(c.external_id) : null;
    if (!ext) {
      outcomes.push("new");
      continue;
    }
    const dbRow = existing.get(ext);
    if (!dbRow) {
      outcomes.push("new");
      continue;
    }
    if (rowsEqual(dbRow, c, fields)) {
      outcomes.push("skip");
    } else {
      const diff = diffFields(dbRow, c, fields);
      outcomes.push("conflict");
      const nameField = table === "hallazgos" || table === "recomendaciones" ? "titulo" : "nombre";
      const label = c[nameField] ? String(c[nameField]) : ext;
      errors.push({
        sheet,
        row: i + 2,
        external_id: ext,
        type: "modified",
        message: `Fila "${label}" (${ext}) ya existe con contenido distinto. Campos modificados: ${diff.join(", ")}.`,
        diff,
      });
    }
  }
  return { outcomes, errors };
}

// -----------------------------------------------------------------------------
// UPSERT helper con onConflict por external_id
// -----------------------------------------------------------------------------

interface UpsertResult<T = Record<string, unknown>> {
  rows: T[];
  written: number;
}

async function upsertByExternalId<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
): Promise<UpsertResult<T>> {
  if (rows.length === 0) return { rows: [], written: 0 };
  const { data, error } = await supabase
    .from(table)
    .upsert(rows, { onConflict: "external_id" })
    .select();
  if (error) {
    throw new Error(`Upsert ${table}: ${error.message}`);
  }
  return { rows: (data ?? []) as T[], written: (data ?? []).length };
}

/** Reemplaza relaciones N:M para una entidad: borra previas + inserta nuevas. */
async function syncRelations(
  supabase: SupabaseClient,
  table: string,
  ownerColumn: string,
  ownerId: string,
  rows: Record<string, unknown>[],
) {
  await supabase.from(table).delete().eq(ownerColumn, ownerId);
  if (rows.length > 0) {
    const { error } = await supabase.from(table).insert(rows);
    if (error) throw new Error(`Insert ${table}: ${error.message}`);
  }
}

// -----------------------------------------------------------------------------
// HANDLER
// -----------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  let payload: { file_path?: string; bucket?: string; dry_run?: boolean };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Body JSON inválido" }, 400);
  }
  const filePath = payload.file_path;
  const bucket = payload.bucket ?? "imports";
  const dryRun = payload.dry_run === true;
  if (!filePath) {
    return json({ error: "Falta el parámetro 'file_path'" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Variables de entorno de Supabase ausentes" }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Log inicial (solo en import real)
  let logId: string | null = null;
  if (!dryRun) {
    const { data } = await supabase
      .from("import_logs")
      .insert({ file_name: filePath, status: "processing" })
      .select("id")
      .single();
    if (data) logId = String(data.id);
  }
  const finishLog = async (status: "success" | "error", errorMessage?: string) => {
    if (!logId) return;
    await supabase
      .from("import_logs")
      .update({ status, error_message: errorMessage ?? null })
      .eq("id", logId);
  };

  try {
    // -------------------------------------------------------------------------
    // 1. Descargar y parsear el archivo
    // -------------------------------------------------------------------------
    const { data: file, error: dlError } = await supabase.storage
      .from(bucket)
      .download(filePath);
    if (dlError || !file) {
      throw new Error(
        `No se pudo descargar ${bucket}/${filePath}: ${dlError?.message ?? "desconocido"}`,
      );
    }
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });

    // -------------------------------------------------------------------------
    // 2. Leer todas las hojas relevantes
    // -------------------------------------------------------------------------
    const sheetNames = {
      misiones: findSheet(wb, "misiones"),
      retos: findSheet(wb, "retos"),
      agentes: findSheet(wb, "agentes"),
      proyectos: findSheet(wb, "proyectos"),
      innovaciones: findSheet(wb, "innovaciones"),
      hallazgos: findSheet(wb, "hallazgos"),
      recomendaciones: findSheet(wb, "recomendaciones"),
    };

    const data = {
      misiones: sheetNames.misiones ? readSheet(wb, sheetNames.misiones) : [],
      retos: sheetNames.retos ? readSheet(wb, sheetNames.retos) : [],
      agentes: sheetNames.agentes ? readSheet(wb, sheetNames.agentes) : [],
      proyectos: sheetNames.proyectos ? readSheet(wb, sheetNames.proyectos) : [],
      innovaciones: sheetNames.innovaciones
        ? readSheet(wb, sheetNames.innovaciones)
        : [],
      hallazgos: sheetNames.hallazgos ? readSheet(wb, sheetNames.hallazgos) : [],
      recomendaciones: sheetNames.recomendaciones
        ? readSheet(wb, sheetNames.recomendaciones)
        : [],
    };

    const summary: ImportSummary = {
      misiones: { found: data.misiones.length, written: 0, skipped: 0 },
      retos: { found: data.retos.length, written: 0, skipped: 0 },
      agentes: { found: data.agentes.length, written: 0, skipped: 0 },
      proyectos: { found: data.proyectos.length, written: 0, skipped: 0 },
      innovaciones: { found: data.innovaciones.length, written: 0, skipped: 0 },
      hallazgos: { found: data.hallazgos.length, written: 0, skipped: 0 },
      recomendaciones: { found: data.recomendaciones.length, written: 0, skipped: 0 },
    };

    const validationErrors: ValidationError[] = [];

    // -------------------------------------------------------------------------
    // 3. Modo dry_run: solo devolver conteos
    // -------------------------------------------------------------------------
    if (dryRun) {
      return json({
        ok: true,
        dry_run: true,
        file: `${bucket}/${filePath}`,
        sheets_detected: Object.fromEntries(
          Object.entries(sheetNames).map(([k, v]) => [k, v]),
        ),
        summary: Object.fromEntries(
          Object.entries(summary).map(([k, v]) => [k, v.found]),
        ),
      });
    }

    // -------------------------------------------------------------------------
    // 4. UPSERT secuencial respetando dependencias
    // -------------------------------------------------------------------------

    // Mapas: external_id (M001) → uuid de BD
    const misionIds = new Map<string, string>();
    const retoIds = new Map<string, string>();
    const agenteIds = new Map<string, string>();
    const agenteNombres = new Map<string, string>(); // nombre normalizado → uuid
    const proyectoIds = new Map<string, string>();
    const innovacionIds = new Map<string, string>();
    const hallazgoIds = new Map<string, string>();

    // Pre-cargar TODOS los agentes existentes en BD para que la creación
    // de stubs (líderes/socios referenciados solo por nombre) sea idempotente
    // entre re-imports. Sin esto, cada corrida creaba duplicados de los stubs.
    {
      const { data: existingAgentes } = await supabase
        .from("agentes")
        .select("id, nombre, external_id");
      for (const a of existingAgentes ?? []) {
        if (a.external_id) agenteIds.set(a.external_id, a.id);
        if (a.nombre) agenteNombres.set(normKey(a.nombre), a.id);
      }
    }

    // =========================================================================
    // FASE 1 — Construir candidatas + validación (sin escribir nada en BD)
    // =========================================================================

    // ---- Misiones: candidatas
    const misionesCandidates = data.misiones.map((r) => ({
      external_id: toStr(r.ID_Mision),
      nombre: toStr(r.Nombre_mision) ?? "(sin nombre)",
      descripcion: toStr(r.Descripcion),
      problema: toStr(r.Problema_Justificacion),
      fuente_informacion: toStr(r.Fuente_informacion),
      notas_internas: toStr(r.Notas_internas),
    }));

    // ---- Agentes: candidatas
    const agentesCandidates = data.agentes.map((r) => ({
      external_id: toStr(r.ID_Agente),
      nombre: toStr(r.Nombre_agente) ?? "(sin nombre)",
      descripcion: toStr(r.Descripcion_breve),
      email: toStr(r.Email_contacto),
      tipo_agente: mapEnum(r.Tipo_agente, TIPO_AGENTE_MAP),
      personas_implicadas: toInt(r.Personas_implicadas),
      presupuesto: toNum(r.Volumen_inversion_euros),
      web: toStr(r.Web),
      municipio_sede: toStr(r.Municipio_sede),
      rol_ecosistema: resolveRolesEcosistema(r.Rol_ecosistema),
      grupos_poblacion: resolveGruposPoblacion(r.Grupos_poblacion),
      interconexiones_ids: toStr(r.Interconexiones_IDs),
      fuente_informacion: toStr(r.Fuente_informacion),
    }));

    // ---- Retos: candidatas
    const retosCandidates = data.retos.map((r) => ({
      external_id: toStr(r.ID_Reto),
      nombre: toStr(r.Nombre_reto) ?? "(sin nombre)",
      descripcion: toStr(r.Descripcion),
      fuente_informacion: toStr(r.Fuente_informacion),
    }));

    // ---- Proyectos: candidatas (sin agente_lider_id resuelto aún)
    const proyectosCandidates = data.proyectos.map((p) => ({
      external_id: toStr(p.ID_Proyecto),
      nombre: toStr(p.Nombre_proyecto) ?? "(sin nombre)",
      descripcion: toStr(p.Descripcion),
      estado: mapEnum(p.Estado, ESTADO_PROYECTO_MAP),
      fecha_inicio: toDate(p.Fecha_inicio, "start"),
      fecha_fin: toDate(p.Fecha_fin, "end"),
      presupuesto: toNum(p.Presupuesto_euros),
      financiador: toStr(p.Financiador),
      grupos_poblacion: resolveGruposPoblacion(p.Grupos_poblacion),
      ccaa: toStr(p.CCAA),
      enlace_1: toStr(p.Enlace_1),
    }));

    // ---- Innovaciones: candidatas (sin proyecto_id resuelto aún)
    const innovacionesCandidates = data.innovaciones.map((i) => {
      const rangoRaw = toStr(i.Rango_participantes);
      const rango = rangoRaw && RANGO_PARTICIPANTES_VALUES.has(rangoRaw)
        ? rangoRaw
        : null;
      return {
        external_id: toStr(i.ID_Innovacion),
        nombre: toStr(i.Nombre_innovacion) ?? "(sin nombre)",
        descripcion: toStr(i.Descripcion),
        estado: mapEnum(i.Estado_experimentacion, ESTADO_INNOVACION_MAP),
        nivel_impacto: mapEnum(i.Nivel_impacto, NIVEL_IMPACTO_MAP),
        n_participantes: rango,
        grupos_poblacion: resolveGruposPoblacion(i.Grupos_poblacion),
        opciones_escalado: mapEnumList(splitList(i.Opciones_escalado), OPCIONES_ESCALADO_MAP),
        enlace_referencia: toStr(i.Enlace_referencia),
      };
    });

    // ---- Hallazgos: candidatas (sin innovacion_id resuelto aún)
    const hallazgosCandidates = data.hallazgos.map((h) => {
      const estadoVal = mapEnum(h.Estado_validacion, ESTADO_VALIDACION_MAP);
      return {
        external_id: toStr(h.ID_Hallazgo),
        titulo: toStr(h.Titulo_hallazgo) ?? "(sin título)",
        descripcion: toStr(h.Descripcion) ?? "(sin descripción)",
        nivel_evidencia: mapEnum(h.Nivel_evidencia, NIVEL_EVIDENCIA_MAP),
        evidencia_cuantitativa: toStr(h.Evidencia_cuantitativa),
        fuente: toStr(h.Fuente),
        enlace: toStr(h.Enlace_fuente),
        estado_validacion: estadoVal,
        validado: estadoVal === "validado",
      };
    });

    // ---- Recomendaciones: candidatas
    const recomendacionesCandidates = data.recomendaciones.map((r) => ({
      external_id: toStr(r.ID_Recomendacion),
      titulo: toStr(r.Titulo_recomendacion) ?? "(sin título)",
      descripcion: toStr(r.Descripcion) ?? "(sin descripción)",
      ambito: filterEnum(splitList(r.Ambito_aplicacion), AMBITO_RECOMENDACION_VALUES),
      destinatarios: toStr(r.Destinatarios),
      alcance: mapEnum(r.Alcance_territorial, ALCANCE_RECOMENDACION_MAP),
      estado: mapEnum(r.Estado, ESTADO_RECOMENDACION_MAP),
    }));

    // ---- Validación intra-archivo: duplicados de ID y nombre/título
    validationErrors.push(...detectIntraSheetDuplicates("Misiones", misionesCandidates, "nombre"));
    validationErrors.push(...detectIntraSheetDuplicates("Agentes", agentesCandidates, "nombre"));
    validationErrors.push(...detectIntraSheetDuplicates("Retos", retosCandidates, "nombre"));
    validationErrors.push(...detectIntraSheetDuplicates("Proyectos", proyectosCandidates, "nombre"));
    validationErrors.push(...detectIntraSheetDuplicates("Innovaciones", innovacionesCandidates, "nombre"));
    validationErrors.push(...detectIntraSheetDuplicates("Hallazgos", hallazgosCandidates, "titulo"));
    validationErrors.push(...detectIntraSheetDuplicates("Recomendaciones", recomendacionesCandidates, "titulo"));

    // Helper para cargar filas existentes por external_id
    async function loadExisting(
      table: string,
      candidates: Record<string, unknown>[],
    ): Promise<Map<string, Record<string, unknown>>> {
      const ids = candidates.map((c) => c.external_id).filter(Boolean) as string[];
      const out = new Map<string, Record<string, unknown>>();
      if (ids.length === 0) return out;
      const cols = ["id", "external_id", ...COMPARE_FIELDS[table]];
      const { data: ex, error } = await supabase
        .from(table)
        .select(cols.join(", "))
        .in("external_id", ids);
      if (error) throw new Error(`Cargar existentes ${table}: ${error.message}`);
      for (const row of ex ?? []) {
        if ((row as any).external_id) {
          out.set((row as any).external_id, row as any);
        }
      }
      return out;
    }

    const misionesExisting = await loadExisting("misiones", misionesCandidates);
    const agentesExisting = await loadExisting("agentes", agentesCandidates);
    const retosExisting = await loadExisting("retos", retosCandidates);
    const proyectosExisting = await loadExisting("proyectos", proyectosCandidates);
    const innovacionesExisting = await loadExisting("innovaciones", innovacionesCandidates);
    const hallazgosExisting = await loadExisting("hallazgos", hallazgosCandidates);
    const recomendacionesExisting = await loadExisting("recomendaciones", recomendacionesCandidates);

    const misionesCls = classifyAgainstDb("Misiones", "misiones", misionesCandidates, misionesExisting);
    const agentesCls = classifyAgainstDb("Agentes", "agentes", agentesCandidates, agentesExisting);
    const retosCls = classifyAgainstDb("Retos", "retos", retosCandidates, retosExisting);
    const proyectosCls = classifyAgainstDb("Proyectos", "proyectos", proyectosCandidates, proyectosExisting);
    const innovacionesCls = classifyAgainstDb("Innovaciones", "innovaciones", innovacionesCandidates, innovacionesExisting);
    const hallazgosCls = classifyAgainstDb("Hallazgos", "hallazgos", hallazgosCandidates, hallazgosExisting);
    const recomendacionesCls = classifyAgainstDb("Recomendaciones", "recomendaciones", recomendacionesCandidates, recomendacionesExisting);

    validationErrors.push(...misionesCls.errors);
    validationErrors.push(...agentesCls.errors);
    validationErrors.push(...retosCls.errors);
    validationErrors.push(...proyectosCls.errors);
    validationErrors.push(...innovacionesCls.errors);
    validationErrors.push(...hallazgosCls.errors);
    validationErrors.push(...recomendacionesCls.errors);

    // Si hay errores de validación, abortamos sin escribir nada.
    if (validationErrors.length > 0) {
      await finishLog("error", `${validationErrors.length} errores de validación`);
      return json({
        ok: false,
        validation_errors: validationErrors,
        summary: Object.fromEntries(
          Object.entries(summary).map(([k, v]) => [k, v.found]),
        ),
        log_id: logId,
      }, 422);
    }

    // =========================================================================
    // FASE 2 — Escritura: insertar NEW, omitir SKIP. Reconstruir relaciones M:N
    // para todas las filas presentes en el archivo.
    // =========================================================================

    /** Inserta solo las filas marcadas como "new" y devuelve el mapeo external_id→uuid
     *  para todas las filas (NEW + SKIP). */
    async function writeEntity(
      table: string,
      candidates: Record<string, unknown>[],
      outcomes: RowOutcome[],
      existing: Map<string, Record<string, unknown>>,
      summaryKey: keyof ImportSummary,
    ): Promise<Map<string, string>> {
      const idMap = new Map<string, string>();
      // Skipped → ya existen, sacar UUID del row de BD
      for (let i = 0; i < candidates.length; i++) {
        if (outcomes[i] === "skip") {
          const ext = candidates[i].external_id as string;
          const dbRow = existing.get(ext)!;
          idMap.set(ext, (dbRow as any).id);
          summary[summaryKey].skipped++;
        }
      }
      // New → insertar
      const newRows = candidates.filter((_, i) => outcomes[i] === "new");
      if (newRows.length > 0) {
        const { data: inserted, error } = await supabase
          .from(table)
          .insert(newRows)
          .select("id, external_id");
        if (error) throw new Error(`Insert ${table}: ${error.message}`);
        for (const row of inserted ?? []) {
          if ((row as any).external_id) {
            idMap.set((row as any).external_id, (row as any).id);
          }
        }
        summary[summaryKey].written = inserted?.length ?? 0;
      }
      return idMap;
    }

    // ---- Misiones
    {
      const ids = await writeEntity(
        "misiones",
        misionesCandidates,
        misionesCls.outcomes,
        misionesExisting,
        "misiones",
      );
      ids.forEach((v, k) => misionIds.set(k, v));
    }

    // ---- Agentes
    {
      const ids = await writeEntity(
        "agentes",
        agentesCandidates,
        agentesCls.outcomes,
        agentesExisting,
        "agentes",
      );
      ids.forEach((v, k) => agenteIds.set(k, v));
      // Refrescar agenteNombres con todos (NEW + SKIP)
      for (const c of agentesCandidates) {
        const ext = c.external_id as string;
        const uuid = ids.get(ext);
        if (uuid && c.nombre) agenteNombres.set(normKey(c.nombre as string), uuid);
      }
    }

    // ---- Retos
    {
      const ids = await writeEntity(
        "retos",
        retosCandidates,
        retosCls.outcomes,
        retosExisting,
        "retos",
      );
      ids.forEach((v, k) => retoIds.set(k, v));

      // Reconstruir retos_misiones para todos los retos del archivo
      for (const r of data.retos) {
        const retoExt = toStr(r.ID_Reto);
        const retoUuid = retoExt ? retoIds.get(retoExt) : null;
        if (!retoUuid) continue;

        const misionExternals: string[] = [];
        for (const [k, v] of Object.entries(r)) {
          if (k.startsWith("ID_Mision") && v) {
            misionExternals.push(...splitList(v));
          }
        }
        const links = misionExternals
          .map((ext) => misionIds.get(ext))
          .filter((id): id is string => !!id)
          .map((mision_id) => ({ reto_id: retoUuid, mision_id }));

        await syncRelations(supabase, "retos_misiones", "reto_id", retoUuid, links);
      }
    }

    // ---- Proyectos
    // Helper: resolver agente por external_id o por nombre. No crea stubs.
    function resolveAgente(value: unknown): string | null {
      const v = toStr(value);
      if (!v) return null;
      if (/^A\d+$/i.test(v) && agenteIds.has(v.toUpperCase())) {
        return agenteIds.get(v.toUpperCase()) ?? null;
      }
      const byName = agenteNombres.get(normKey(v));
      if (byName) return byName;
      return null;
    }

    {
      // Inyectar agente_lider_id resuelto en cada candidata antes de insertar.
      // Para SKIP rows, el lider ya existe en la BD; lo dejamos en null y solo
      // lo seteamos en NEW rows (las que vamos a insertar).
      for (let i = 0; i < proyectosCandidates.length; i++) {
        if (proyectosCls.outcomes[i] === "new") {
          const liderId = resolveAgente(data.proyectos[i].ID_Agente_lider);
          if (!liderId) {
            // Fallback: si no se resuelve, marcamos como "no insertar"
            proyectosCls.outcomes[i] = "skip";
            continue;
          }
          (proyectosCandidates[i] as Record<string, unknown>).agente_lider_id = liderId;
        }
      }

      const ids = await writeEntity(
        "proyectos",
        proyectosCandidates,
        proyectosCls.outcomes,
        proyectosExisting,
        "proyectos",
      );
      ids.forEach((v, k) => proyectoIds.set(k, v));

      // Reconstruir proyectos_agentes para todos los proyectos del archivo
      for (let i = 0; i < data.proyectos.length; i++) {
        const p = data.proyectos[i];
        const projExt = toStr(p.ID_Proyecto);
        const projUuid = projExt ? proyectoIds.get(projExt) : null;
        if (!projUuid) continue;

        const liderId = resolveAgente(p.ID_Agente_lider);
        const sociosTokens = splitListWithY(p.IDs_Agentes_socios);
        const sociosUuids: string[] = [];
        for (const token of sociosTokens) {
          const id = resolveAgente(token);
          if (id && id !== liderId) sociosUuids.push(id);
        }
        const links = Array.from(new Set(sociosUuids)).map((agente_id) => ({
          proyecto_id: projUuid,
          agente_id,
        }));
        await syncRelations(supabase, "proyectos_agentes", "proyecto_id", projUuid, links);
      }
    }

    // ---- Innovaciones
    {
      // Inyectar proyecto_id en candidatas NEW
      for (let i = 0; i < innovacionesCandidates.length; i++) {
        if (innovacionesCls.outcomes[i] === "new") {
          const projExt = toStr(data.innovaciones[i].ID_Proyecto);
          const projUuid = projExt ? proyectoIds.get(projExt) : null;
          if (!projUuid) {
            innovacionesCls.outcomes[i] = "skip";
            continue;
          }
          (innovacionesCandidates[i] as Record<string, unknown>).proyecto_id = projUuid;
        }
      }

      const ids = await writeEntity(
        "innovaciones",
        innovacionesCandidates,
        innovacionesCls.outcomes,
        innovacionesExisting,
        "innovaciones",
      );
      ids.forEach((v, k) => innovacionIds.set(k, v));

      // Reconstruir innovaciones_retos para todas las innovaciones del archivo
      for (const i of data.innovaciones) {
        const innExt = toStr(i.ID_Innovacion);
        const innUuid = innExt ? innovacionIds.get(innExt) : null;
        if (!innUuid) continue;

        const retoExternals: string[] = [];
        for (const [k, v] of Object.entries(i)) {
          if (k.startsWith("ID_Reto") && v) {
            retoExternals.push(...splitList(v));
          }
        }
        const links = Array.from(
          new Set(
            retoExternals
              .map((ext) => retoIds.get(ext))
              .filter((id): id is string => !!id),
          ),
        ).map((reto_id) => ({ innovacion_id: innUuid, reto_id }));

        await syncRelations(supabase, "innovaciones_retos", "innovacion_id", innUuid, links);
      }
    }

    // ---- Hallazgos
    {
      for (let i = 0; i < hallazgosCandidates.length; i++) {
        if (hallazgosCls.outcomes[i] === "new") {
          const innExt = toStr(data.hallazgos[i].ID_Innovacion);
          const innUuid = innExt ? innovacionIds.get(innExt) : null;
          if (!innUuid) {
            hallazgosCls.outcomes[i] = "skip";
            continue;
          }
          (hallazgosCandidates[i] as Record<string, unknown>).innovacion_id = innUuid;
        }
      }

      const ids = await writeEntity(
        "hallazgos",
        hallazgosCandidates,
        hallazgosCls.outcomes,
        hallazgosExisting,
        "hallazgos",
      );
      ids.forEach((v, k) => hallazgoIds.set(k, v));
    }

    // ---- Recomendaciones
    {
      const ids = await writeEntity(
        "recomendaciones",
        recomendacionesCandidates,
        recomendacionesCls.outcomes,
        recomendacionesExisting,
        "recomendaciones",
      );

      // Reconstruir recomendaciones_hallazgos para todas las recomendaciones del archivo
      for (const r of data.recomendaciones) {
        const recExt = toStr(r.ID_Recomendacion);
        const recUuid = recExt ? ids.get(recExt) : null;
        if (!recUuid) continue;

        const hallTokens = splitList(r.IDs_Hallazgos);
        const links = Array.from(
          new Set(
            hallTokens
              .map((ext) => hallazgoIds.get(ext))
              .filter((id): id is string => !!id),
          ),
        ).map((hallazgo_id) => ({ recomendacion_id: recUuid, hallazgo_id }));

        await syncRelations(supabase, "recomendaciones_hallazgos", "recomendacion_id", recUuid, links);
      }
    }

    // -------------------------------------------------------------------------
    await finishLog("success");
    return json({
      ok: true,
      file: `${bucket}/${filePath}`,
      sheets_detected: Object.fromEntries(
        Object.entries(sheetNames).map(([k, v]) => [k, v]),
      ),
      summary: Object.fromEntries(
        Object.entries(summary).map(([k, v]) => [k, v.written]),
      ),
      skipped: Object.fromEntries(
        Object.entries(summary).map(([k, v]) => [k, v.skipped]),
      ),
      details: summary,
      log_id: logId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishLog("error", message);
    return json({ ok: false, error: message, log_id: logId }, 500);
  }
});
