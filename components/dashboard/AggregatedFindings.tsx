"use client";

import { useEffect, useState } from "react";
import {
  Microscope,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Flag,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useMission } from "@/lib/contexts/MissionContext";
import {
  getHallazgosPorReto,
  type RetoConHallazgos,
  type HallazgoLite,
} from "@/lib/queries/aggregated";
import type { NivelEvidencia } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

// =============================================================================
// Configuración de niveles de evidencia
// =============================================================================

const evidenciaLabel: Record<NivelEvidencia, string> = {
  practica_documentada: "Práctica documentada",
  datos_sistematicos: "Datos sistemáticos",
  evaluacion_estructurada: "Evaluación estructurada",
  evidencia_replicada: "Evidencia replicada",
};

const evidenciaTone: Record<
  NivelEvidencia,
  "slate" | "blue" | "purple" | "green"
> = {
  practica_documentada: "slate",
  datos_sistematicos: "blue",
  evaluacion_estructurada: "purple",
  evidencia_replicada: "green",
};

// =============================================================================
// Componente principal
// =============================================================================

export function AggregatedFindings() {
  const { selectedMisionId, selectedMision } = useMission();
  const [retos, setRetos] = useState<RetoConHallazgos[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getHallazgosPorReto(selectedMisionId).then((data) => {
      if (cancelled) return;
      setRetos(data);
      // Por defecto, expandidos los retos con hallazgos
      setExpanded(
        new Set(data.filter((r) => r.hallazgos.length > 0).map((r) => r.id)),
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedMisionId]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Solo mostramos retos que tengan al menos un hallazgo
  const retosConHallazgos = retos.filter((r) => r.hallazgos.length > 0);
  const totalHallazgos = retosConHallazgos.reduce(
    (sum, r) => sum + r.hallazgos.length,
    0,
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Hallazgos agregados
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Evidencias agrupadas por reto, derivadas de las innovaciones
            asociadas.
          </p>
        </div>
        {!loading && retosConHallazgos.length > 0 && (
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums text-slate-900">
              {totalHallazgos}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              hallazgos
              {selectedMision && ` · ${selectedMision.nombre}`}
            </p>
          </div>
        )}
      </header>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : retosConHallazgos.length === 0 ? (
        <EmptyState
          icon={Microscope}
          title="No hay hallazgos todavía"
          description={
            selectedMision
              ? "Esta misión aún no tiene hallazgos agregados."
              : "Documenta hallazgos en tus innovaciones para verlos aquí agrupados por reto."
          }
        />
      ) : (
        <ul className="space-y-2">
          {retosConHallazgos.map((reto) => (
            <RetoGroup
              key={reto.id}
              reto={reto}
              expanded={expanded.has(reto.id)}
              onToggle={() => toggle(reto.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// =============================================================================
// Grupo por reto (acordeón)
// =============================================================================

function RetoGroup({
  reto,
  expanded,
  onToggle,
}: {
  reto: RetoConHallazgos;
  expanded: boolean;
  onToggle: () => void;
}) {
  const validados = reto.hallazgos.filter((h) => h.validado).length;
  const Caret = expanded ? ChevronDown : ChevronRight;

  return (
    <li className="overflow-hidden rounded-md border border-slate-200">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 bg-slate-50/50 px-3 py-2 text-left transition-colors hover:bg-slate-50"
        aria-expanded={expanded}
      >
        <Caret className="h-4 w-4 shrink-0 text-slate-400" />
        <Flag className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        <span className="flex-1 truncate text-sm font-medium text-slate-900">
          {reto.nombre}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {validados > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-green-700">
              <CheckCircle2 className="h-3 w-3" />
              {validados}
            </span>
          )}
          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-700">
            {reto.hallazgos.length}
          </span>
        </div>
      </button>

      {expanded && (
        <ul className="divide-y divide-slate-100">
          {reto.hallazgos.map((h) => (
            <FindingRow key={h.id} hallazgo={h} />
          ))}
        </ul>
      )}
    </li>
  );
}

// =============================================================================
// Fila de hallazgo
// =============================================================================

function FindingRow({ hallazgo }: { hallazgo: HallazgoLite }) {
  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <div
        className={cn(
          "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
          hallazgo.validado ? "bg-green-500" : "bg-slate-300",
        )}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-slate-900">{hallazgo.titulo}</p>
          {hallazgo.nivel_evidencia && (
            <Badge tone={evidenciaTone[hallazgo.nivel_evidencia]}>
              {evidenciaLabel[hallazgo.nivel_evidencia]}
            </Badge>
          )}
        </div>
        {hallazgo.innovacion_nombre && (
          <p className="mt-0.5 text-[11px] text-slate-500">
            Innovación: {hallazgo.innovacion_nombre}
          </p>
        )}
      </div>
    </li>
  );
}
