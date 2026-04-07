"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/Badge";
import type {
  RecomendacionConRelaciones,
  AlcanceRecomendacion,
  EstadoRecomendacion,
} from "@/lib/supabase/types";

const alcanceLabel: Record<AlcanceRecomendacion, string> = {
  local: "Local",
  provincial: "Provincial",
  autonomico: "Autonómico",
  estatal: "Estatal",
  pluriautonomico: "Pluriautonómico",
};

const estadoLabel: Record<EstadoRecomendacion, string> = {
  formulada: "Formulada",
  en_proceso: "En proceso",
  adoptada: "Adoptada",
  descartada: "Descartada",
};

const estadoTone: Record<EstadoRecomendacion, "slate" | "blue" | "green" | "red"> = {
  formulada: "slate",
  en_proceso: "blue",
  adoptada: "green",
  descartada: "red",
};

export const recomendacionesColumns: ColumnDef<RecomendacionConRelaciones>[] = [
  {
    accessorKey: "titulo",
    header: "Título",
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-slate-900">{row.original.titulo}</div>
        <div className="line-clamp-1 text-xs text-slate-500">
          {row.original.descripcion}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "alcance",
    header: "Alcance",
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
    cell: ({ row }) => {
      const e = row.original.estado;
      if (!e) return <span className="text-slate-400">—</span>;
      return <Badge tone={estadoTone[e]}>{estadoLabel[e]}</Badge>;
    },
  },
  {
    id: "hallazgos",
    header: "Hallazgos",
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
