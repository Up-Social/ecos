"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/Badge";
import {
  ALCANCE_TERRITORIAL_LABELS,
  ESTADO_RECOMENDACION_LABELS,
} from "@/lib/enums";
import type {
  RecomendacionConRelaciones,
  EstadoRecomendacion,
} from "@/lib/supabase/types";

const alcanceLabel = ALCANCE_TERRITORIAL_LABELS;
const estadoLabel = ESTADO_RECOMENDACION_LABELS;

const estadoTone: Record<EstadoRecomendacion, "slate" | "blue" | "green" | "red"> = {
  formulada: "slate",
  en_proceso_adopcion: "blue",
  adoptada: "green",
  descartada: "red",
};

export const recomendacionesColumns: ColumnDef<RecomendacionConRelaciones>[] = [
  {
    accessorKey: "titulo",
    header: "Título",
    meta: { width: "50%" },
    cell: ({ row }) => (
      <div>
        <div className="whitespace-normal break-words font-medium text-slate-900">
          {row.original.titulo}
        </div>
        <div className="line-clamp-2 text-xs text-slate-500">
          {row.original.descripcion}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "alcance",
    header: "Alcance",
    meta: { width: "18%" },
    cell: ({ row }) => {
      const a = row.original.alcance;
      return a ? (
        <span className="text-slate-700">{alcanceLabel[a]}</span>
      ) : (
        <span className="text-slate-400">—</span>
      );
    },
  },
  {
    accessorKey: "estado",
    header: "Estado",
    meta: { width: "18%" },
    cell: ({ row }) => {
      const e = row.original.estado;
      if (!e) return <span className="text-slate-400">—</span>;
      return <Badge tone={estadoTone[e]}>{estadoLabel[e]}</Badge>;
    },
  },
  {
    id: "hallazgos",
    header: "Hallazgos",
    meta: { width: "14%" },
    cell: ({ row }) => {
      const n = row.original.hallazgos.length;
      return n > 0 ? (
        <Badge tone="slate">{n}</Badge>
      ) : (
        <span className="text-slate-400">—</span>
      );
    },
  },
];
