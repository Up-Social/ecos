"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";
import Link from "next/link";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ListChecks,
  Eye,
  X,
  Download,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { runImport, type ImportResult } from "@/lib/queries/imports";
import { cn } from "@/lib/utils";

const ENTITY_LABELS: Record<string, string> = {
  territorios: "Territorios",
  misiones: "Misiones",
  retos: "Retos",
  agentes: "Agentes",
  proyectos: "Proyectos",
  innovaciones: "Innovaciones",
  hallazgos: "Hallazgos",
  recomendaciones: "Recomendaciones",
  retos_misiones: "Retos ↔ Misiones",
  proyectos_agentes: "Proyectos ↔ Agentes",
  innovaciones_retos: "Innovaciones ↔ Retos",
  recomendaciones_hallazgos: "Recomendaciones ↔ Hallazgos",
};

export default function ImportarPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // ---------------------------------------------------------------------------
  // Drag & drop handlers
  // ---------------------------------------------------------------------------
  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      validateAndSet(dropped);
    }
  }, []);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) validateAndSet(picked);
  }

  function validateAndSet(f: File) {
    const ok = /\.(xlsx|xls)$/i.test(f.name);
    if (!ok) {
      setResult({ ok: false, error: "El archivo debe ser .xlsx o .xls" });
      return;
    }
    setFile(f);
    setResult(null);
  }

  function clearFile() {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  // ---------------------------------------------------------------------------
  // Importar
  // ---------------------------------------------------------------------------
  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await runImport(file, { dryRun });
      setResult(res);
      // Si fue exitoso e import real (no dry_run), limpiamos el archivo
      if (res.ok && !res.dry_run) {
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch (e: any) {
      setResult({ ok: false, error: e.message ?? "Error inesperado" });
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Importar Excel</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sube un archivo .xlsx con el formato de la plantilla ECOS. Si una
            fila ya existe idéntica, se omite. Si tiene el mismo identificador
            o nombre con contenido modificado, la importación se detiene.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <a
            href="/templates/ECOS_Plantilla.xlsx"
            download
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Descargar plantilla
          </a>
          <Link
            href="/dashboard/logs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <ListChecks className="h-4 w-4" />
            Ver historial
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Drop zone                                                            */}
      {/* ------------------------------------------------------------------- */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white px-6 py-12 text-center transition-colors",
          dragging
            ? "border-brand-500 bg-brand-50"
            : "border-slate-300 hover:border-slate-400",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={onPickFile}
        />
        <FileSpreadsheet
          className={cn(
            "mb-3 h-12 w-12",
            dragging ? "text-brand-600" : "text-slate-400",
          )}
        />
        <p className="text-sm font-medium text-slate-700">
          {dragging
            ? "Suelta el archivo aquí"
            : "Arrastra un .xlsx o haz click para seleccionar"}
        </p>
        <p className="mt-1 text-xs text-slate-400">Tamaño máximo recomendado: 10 MB</p>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Selected file row                                                    */}
      {/* ------------------------------------------------------------------- */}
      {file && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-brand-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">{file.name}</p>
              <p className="text-xs text-slate-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Quitar archivo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Options + button                                                     */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <Eye className="h-4 w-4 text-slate-400" />
          <span>
            <strong>Modo simulación</strong> (dry run) — solo cuenta filas, no
            escribe en BD
          </span>
        </label>
        <Button onClick={handleImport} disabled={!file || loading}>
          <Upload className="h-4 w-4" />
          {loading ? "Procesando…" : dryRun ? "Simular" : "Importar"}
        </Button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Loading skeleton                                                     */}
      {/* ------------------------------------------------------------------- */}
      {loading && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
            <p className="text-sm text-slate-600">
              {dryRun
                ? "Analizando archivo…"
                : "Subiendo y procesando archivo en el servidor…"}
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Result                                                               */}
      {/* ------------------------------------------------------------------- */}
      {result && !loading && <ResultCard result={result} />}
    </div>
  );
}

// =============================================================================
// Subcomponente: tarjeta de resultado
// =============================================================================
function ResultCard({ result }: { result: ImportResult }) {
  const ok = result.ok;
  const summary = result.summary ?? {};
  const skipped = result.skipped ?? {};
  const validationErrors = result.validation_errors ?? [];
  const entries = Object.entries(summary);
  const hasValidationErrors = validationErrors.length > 0;

  // Estados visuales:
  // - OK exitoso (verde)
  // - Error de validación con lista (ámbar/rojo, pausa la importación)
  // - Error genérico (rojo)
  const headerTone = ok
    ? "border-green-100 bg-green-50"
    : hasValidationErrors
      ? "border-amber-100 bg-amber-50"
      : "border-red-100 bg-red-50";
  const borderTone = ok
    ? "border-green-200"
    : hasValidationErrors
      ? "border-amber-200"
      : "border-red-200";

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-white", borderTone)}>
      <header className={cn("flex items-center gap-2 border-b px-4 py-3", headerTone)}>
        {ok ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : hasValidationErrors ? (
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" />
        )}
        <div className="flex-1">
          <p
            className={cn(
              "text-sm font-medium",
              ok
                ? "text-green-900"
                : hasValidationErrors
                  ? "text-amber-900"
                  : "text-red-900",
            )}
          >
            {ok
              ? result.dry_run
                ? "Simulación completada"
                : "Importación completada"
              : hasValidationErrors
                ? "Importación pausada — se han detectado conflictos"
                : "Error en la importación"}
          </p>
          {ok && (
            <p className="text-xs text-slate-600">
              {entries.reduce((s, [, n]) => s + n, 0)} filas insertadas ·{" "}
              {Object.values(skipped).reduce((s, n) => s + (n ?? 0), 0)} omitidas
              (ya existían sin cambios)
            </p>
          )}
          {hasValidationErrors && (
            <p className="text-xs text-amber-800">
              {validationErrors.length} conflicto
              {validationErrors.length === 1 ? "" : "s"} detectado
              {validationErrors.length === 1 ? "" : "s"}. No se ha escrito nada
              en la base de datos.
            </p>
          )}
        </div>
        {result.dry_run && (
          <Badge tone="amber">
            <Eye className="mr-1 h-3 w-3" />
            Dry run
          </Badge>
        )}
      </header>

      {/* Stats: insertadas + omitidas por entidad */}
      {ok && entries.length > 0 && (
        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Entidad
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Insertadas
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Omitidas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map(([key, count]) => (
                <tr key={key}>
                  <td className="px-4 py-2 text-slate-700">
                    {ENTITY_LABELS[key] ?? key}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-slate-900">
                    {count}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-slate-400">
                    {skipped[key] ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lista de errores de validación */}
      {hasValidationErrors && (
        <div className="divide-y divide-slate-100">
          {validationErrors.map((err, idx) => (
            <div key={idx} className="flex gap-3 px-4 py-3">
              <div className="flex-shrink-0 pt-0.5">
                <Badge tone={err.type === "modified" ? "amber" : "red"}>
                  {err.sheet}
                  {err.row ? ` · fila ${err.row}` : ""}
                </Badge>
              </div>
              <div className="flex-1 text-sm text-slate-700">
                {err.message}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error genérico */}
      {!ok && !hasValidationErrors && result.error && (
        <div className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-700">
            Detalle del error
          </p>
          <pre className="overflow-x-auto rounded-md bg-red-50 p-3 text-xs text-red-800">
            {result.error}
          </pre>
        </div>
      )}
    </div>
  );
}
