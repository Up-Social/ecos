import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const BUCKET = "imports";

export interface ImportResult {
  ok: boolean;
  dry_run?: boolean;
  file?: string;
  summary?: Record<string, number>;
  error?: string;
  log_id?: string | null;
}

/**
 * Sube un archivo al bucket de Storage y devuelve la ruta dentro del bucket.
 * Si hay un usuario autenticado, lo prefija con su uid (necesario para RLS).
 */
export async function uploadImportFile(file: File): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const prefix = user ? `${user.id}/` : "";
  const path = `${prefix}${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false });
  if (error) throw new Error(`Error subiendo archivo: ${error.message}`);

  return path;
}

/**
 * Invoca la Edge Function `import-excel` para procesar un archivo previamente
 * subido al bucket. dry_run=true solo cuenta filas, no escribe en BD.
 */
export async function invokeImportExcel(
  filePath: string,
  options: { dryRun?: boolean } = {},
): Promise<ImportResult> {
  const { data, error } = await supabase.functions.invoke("import-excel", {
    body: {
      file_path: filePath,
      bucket: BUCKET,
      dry_run: options.dryRun ?? false,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return data as ImportResult;
}

/**
 * Helper de alto nivel: sube + invoca + devuelve el resultado consolidado.
 */
export async function runImport(
  file: File,
  options: { dryRun?: boolean } = {},
): Promise<ImportResult> {
  const filePath = await uploadImportFile(file);
  return invokeImportExcel(filePath, options);
}
