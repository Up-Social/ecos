"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { ImportLog } from "@/lib/supabase/types";

export default function LogsPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("import_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs((data as ImportLog[] | null) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Logs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Historial de importaciones y eventos del sistema.
          </p>
        </div>
        <Button variant="secondary" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Fecha
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Archivo
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Estado
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Mensaje
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && logs.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-xs text-slate-400"
                >
                  Cargando…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-xs text-slate-400"
                >
                  Aún no hay registros
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-2.5 text-xs text-slate-600">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-4 py-2.5">{log.file_name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {log.status === "success" && (
                      <Badge tone="green">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        OK
                      </Badge>
                    )}
                    {log.status === "error" && (
                      <Badge tone="red">
                        <XCircle className="mr-1 h-3 w-3" />
                        Error
                      </Badge>
                    )}
                    {log.status === "processing" && (
                      <Badge tone="amber">
                        <Clock className="mr-1 h-3 w-3" />
                        En curso
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">
                    {log.error_message ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
