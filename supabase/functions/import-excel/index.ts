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
  [key: string]: { found: number; written: number };
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
  "diseño": "diseno",
  "diseno": "diseno",
  "en diseño": "diseno",
  "en_diseno": "diseno",
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
  "en proceso": "en_proceso",
  "en_proceso": "en_proceso",
  "en proceso de adopcion": "en_proceso",
  "en proceso de adopción": "en_proceso",
  "en_proceso_adopcion": "en_proceso",
  "adoptada": "adoptada",
  "descartada": "descartada",
};

function mapEnum(
  value: unknown,
  map: Record<string, string>,
): string | null {
  const s = toStr(value);
  if (!s) return null;
  return map[normKey(s)] ?? null;
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
      misiones: { found: data.misiones.length, written: 0 },
      retos: { found: data.retos.length, written: 0 },
      agentes: { found: data.agentes.length, written: 0 },
      proyectos: { found: data.proyectos.length, written: 0 },
      innovaciones: { found: data.innovaciones.length, written: 0 },
      hallazgos: { found: data.hallazgos.length, written: 0 },
      recomendaciones: { found: data.recomendaciones.length, written: 0 },
    };

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

    // ---- 4.1 MISIONES ----
    if (data.misiones.length > 0) {
      const rows = data.misiones.map((r) => ({
        external_id: toStr(r.ID_Mision),
        nombre: toStr(r.Nombre_mision) ?? "(sin nombre)",
        descripcion: toStr(r.Descripcion),
        problema: toStr(r.Problema_Justificacion),
      }));
      const { rows: inserted, written } = await upsertByExternalId<{
        id: string;
        external_id: string;
      }>(supabase, "misiones", rows);
      summary.misiones.written = written;
      for (const m of inserted) {
        if (m.external_id) misionIds.set(m.external_id, m.id);
      }
    }

    // ---- 4.2 AGENTES ----
    if (data.agentes.length > 0) {
      const rows = data.agentes.map((r) => ({
        external_id: toStr(r.ID_Agente),
        nombre: toStr(r.Nombre_agente) ?? "(sin nombre)",
        descripcion: toStr(r.Descripcion_breve),
        email: toStr(r.Email_contacto),
        tipo_agente: mapEnum(r.Tipo_agente, TIPO_AGENTE_MAP),
        personas_implicadas: toInt(r.Personas_implicadas),
        presupuesto: toNum(r.Volumen_inversion_euros),
        web: toStr(r.Web),
      }));
      const { rows: inserted, written } = await upsertByExternalId<{
        id: string;
        external_id: string;
        nombre: string;
      }>(supabase, "agentes", rows);
      summary.agentes.written = written;
      for (const a of inserted) {
        if (a.external_id) agenteIds.set(a.external_id, a.id);
        if (a.nombre) agenteNombres.set(normKey(a.nombre), a.id);
      }
    }

    // ---- 4.3 RETOS (depende de Misiones para retos_misiones) ----
    if (data.retos.length > 0) {
      const rows = data.retos.map((r) => ({
        external_id: toStr(r.ID_Reto),
        nombre: toStr(r.Nombre_reto) ?? "(sin nombre)",
        descripcion: toStr(r.Descripcion),
      }));
      const { rows: inserted, written } = await upsertByExternalId<{
        id: string;
        external_id: string;
      }>(supabase, "retos", rows);
      summary.retos.written = written;
      for (const r of inserted) {
        if (r.external_id) retoIds.set(r.external_id, r.id);
      }

      // Sync N:M retos_misiones
      for (const r of data.retos) {
        const retoExt = toStr(r.ID_Reto);
        const retoUuid = retoExt ? retoIds.get(retoExt) : null;
        if (!retoUuid) continue;

        // Recoger TODAS las columnas que empiecen por "ID_Mision"
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

        await syncRelations(
          supabase,
          "retos_misiones",
          "reto_id",
          retoUuid,
          links,
        );
      }
    }

    // ---- 4.4 PROYECTOS (depende de Agentes) ----
    // Helper local: resolver agente líder por ID o nombre, creando stub si no existe.
    async function resolveAgente(value: unknown): Promise<string | null> {
      const v = toStr(value);
      if (!v) return null;

      // 1. ¿Es un external_id (A001, A042, etc.)?
      if (/^A\d+$/i.test(v) && agenteIds.has(v.toUpperCase())) {
        return agenteIds.get(v.toUpperCase()) ?? null;
      }

      // 2. ¿Existe por nombre?
      const byName = agenteNombres.get(normKey(v));
      if (byName) return byName;

      // 3. Crear stub
      const { data: stub, error } = await supabase
        .from("agentes")
        .insert({ nombre: v })
        .select("id, nombre, external_id")
        .single();
      if (error || !stub) return null;
      agenteNombres.set(normKey(stub.nombre), stub.id);
      if (stub.external_id) agenteIds.set(stub.external_id, stub.id);
      return stub.id;
    }

    if (data.proyectos.length > 0) {
      const projectRows: Record<string, unknown>[] = [];
      // Pre-resolución secuencial de líderes (puede crear agentes stub)
      const liderIds: (string | null)[] = [];
      for (const p of data.proyectos) {
        liderIds.push(await resolveAgente(p.ID_Agente_lider));
      }

      for (let i = 0; i < data.proyectos.length; i++) {
        const p = data.proyectos[i];
        const liderId = liderIds[i];
        if (!liderId) continue; // sin líder no podemos crear el proyecto (NOT NULL)
        projectRows.push({
          external_id: toStr(p.ID_Proyecto),
          nombre: toStr(p.Nombre_proyecto) ?? "(sin nombre)",
          descripcion: toStr(p.Descripcion),
          agente_lider_id: liderId,
          estado: mapEnum(p.Estado, ESTADO_PROYECTO_MAP),
          fecha_inicio: toDate(p.Fecha_inicio, "start"),
          fecha_fin: toDate(p.Fecha_fin, "end"),
          presupuesto: toNum(p.Presupuesto_euros),
          financiador: toStr(p.Financiador),
        });
      }

      const { rows: inserted, written } = await upsertByExternalId<{
        id: string;
        external_id: string;
      }>(supabase, "proyectos", projectRows);
      summary.proyectos.written = written;
      for (const p of inserted) {
        if (p.external_id) proyectoIds.set(p.external_id, p.id);
      }

      // Sync N:M proyectos_agentes (socios)
      for (let i = 0; i < data.proyectos.length; i++) {
        const p = data.proyectos[i];
        const projExt = toStr(p.ID_Proyecto);
        const projUuid = projExt ? proyectoIds.get(projExt) : null;
        if (!projUuid) continue;

        const liderId = liderIds[i];
        const sociosTokens = splitList(p.IDs_Agentes_socios);
        const sociosUuids: string[] = [];
        for (const token of sociosTokens) {
          const id = await resolveAgente(token);
          if (id && id !== liderId) sociosUuids.push(id);
        }
        const links = Array.from(new Set(sociosUuids)).map((agente_id) => ({
          proyecto_id: projUuid,
          agente_id,
        }));
        await syncRelations(
          supabase,
          "proyectos_agentes",
          "proyecto_id",
          projUuid,
          links,
        );
      }
    }

    // ---- 4.5 INNOVACIONES (depende de Proyectos) ----
    if (data.innovaciones.length > 0) {
      const rows: Record<string, unknown>[] = [];
      for (const i of data.innovaciones) {
        const projExt = toStr(i.ID_Proyecto);
        const projUuid = projExt ? proyectoIds.get(projExt) : null;
        if (!projUuid) continue;
        rows.push({
          external_id: toStr(i.ID_Innovacion),
          nombre: toStr(i.Nombre_innovacion) ?? "(sin nombre)",
          descripcion: toStr(i.Descripcion),
          proyecto_id: projUuid,
          estado: mapEnum(i.Estado_experimentacion, ESTADO_INNOVACION_MAP),
          nivel_impacto: mapEnum(i.Nivel_impacto, NIVEL_IMPACTO_MAP),
          n_participantes: toStr(i.Rango_participantes),
        });
      }

      const { rows: inserted, written } = await upsertByExternalId<{
        id: string;
        external_id: string;
      }>(supabase, "innovaciones", rows);
      summary.innovaciones.written = written;
      for (const x of inserted) {
        if (x.external_id) innovacionIds.set(x.external_id, x.id);
      }

      // Sync N:M innovaciones_retos (cualquier columna ID_Reto*)
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

        await syncRelations(
          supabase,
          "innovaciones_retos",
          "innovacion_id",
          innUuid,
          links,
        );
      }
    }

    // ---- 4.6 HALLAZGOS (depende de Innovaciones) ----
    if (data.hallazgos.length > 0) {
      const rows: Record<string, unknown>[] = [];
      for (const h of data.hallazgos) {
        const innExt = toStr(h.ID_Innovacion);
        const innUuid = innExt ? innovacionIds.get(innExt) : null;
        if (!innUuid) continue;

        // Hallazgos requiere titulo + descripcion no nulos en BD.
        const titulo = toStr(h.Titulo_hallazgo) ?? "(sin título)";
        const descripcion = toStr(h.Descripcion) ?? "(sin descripción)";

        rows.push({
          external_id: toStr(h.ID_Hallazgo),
          titulo,
          descripcion,
          nivel_evidencia: mapEnum(h.Nivel_evidencia, NIVEL_EVIDENCIA_MAP),
          evidencia_cuantitativa: toStr(h.Evidencia_cuantitativa),
          fuente: toStr(h.Fuente),
          enlace: toStr(h.Enlace_fuente),
          innovacion_id: innUuid,
          validado: toBool(h.Estado_validacion, ["validado"]),
        });
      }

      const { rows: inserted, written } = await upsertByExternalId<{
        id: string;
        external_id: string;
      }>(supabase, "hallazgos", rows);
      summary.hallazgos.written = written;
      for (const x of inserted) {
        if (x.external_id) hallazgoIds.set(x.external_id, x.id);
      }
    }

    // ---- 4.7 RECOMENDACIONES (depende de Hallazgos) ----
    if (data.recomendaciones.length > 0) {
      const rows = data.recomendaciones.map((r) => ({
        external_id: toStr(r.ID_Recomendacion),
        titulo: toStr(r.Titulo_recomendacion) ?? "(sin título)",
        descripcion: toStr(r.Descripcion) ?? "(sin descripción)",
        ambito: splitList(r.Ambito_aplicacion),
        destinatarios: toStr(r.Destinatarios),
        alcance: mapEnum(r.Alcance_territorial, ALCANCE_RECOMENDACION_MAP),
        estado: mapEnum(r.Estado, ESTADO_RECOMENDACION_MAP),
      }));

      const recIds = new Map<string, string>();
      const { rows: inserted, written } = await upsertByExternalId<{
        id: string;
        external_id: string;
      }>(supabase, "recomendaciones", rows);
      summary.recomendaciones.written = written;
      for (const x of inserted) {
        if (x.external_id) recIds.set(x.external_id, x.id);
      }

      // Sync N:M recomendaciones_hallazgos
      for (const r of data.recomendaciones) {
        const recExt = toStr(r.ID_Recomendacion);
        const recUuid = recExt ? recIds.get(recExt) : null;
        if (!recUuid) continue;

        const hallTokens = splitList(r.IDs_Hallazgos);
        const links = Array.from(
          new Set(
            hallTokens
              .map((ext) => hallazgoIds.get(ext))
              .filter((id): id is string => !!id),
          ),
        ).map((hallazgo_id) => ({ recomendacion_id: recUuid, hallazgo_id }));

        await syncRelations(
          supabase,
          "recomendaciones_hallazgos",
          "recomendacion_id",
          recUuid,
          links,
        );
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
      details: summary,
      log_id: logId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishLog("error", message);
    return json({ ok: false, error: message, log_id: logId }, 500);
  }
});
