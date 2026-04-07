"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type {
  HallazgoConRelaciones,
  NivelEvidencia,
} from "@/lib/supabase/types";

const evidenciaLabel: Record<NivelEvidencia, string> = {
  practica_documentada: "Práctica documentada",
  datos_sistematicos: "Datos sistemáticos",
  evaluacion_estructurada: "Evaluación estructurada",
  evidencia_replicada: "Evidencia replicada",
};

const evidenciaTone: Record<NivelEvidencia, "slate" | "blue" | "purple" | "green"> = {
  practica_documentada: "slate",
  datos_sistematicos: "blue",
  evaluacion_estructurada: "purple",
  evidencia_replicada: "green",
};

export const hallazgosColumns: ColumnDef<HallazgoConRelaciones>[] = [
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
    id: "innovacion",
    header: "Innovación",
    cell: ({ row }) => row.original.innovacion?.nombre ?? (
      <span className="text-slate-400">—</span>
    ),
  },
  {
    accessorKey: "nivel_evidencia",
    header: "Nivel de evidencia",
    cell: ({ row }) => {
      const e = row.original.nivel_evidencia;
      if (!e) return <span className="text-slate-400">—</span>;
      return <Badge tone={evidenciaTone[e]}>{evidenciaLabel[e]}</Badge>;
    },
  },
  {
    accessorKey: "validado",
    header: "Validado",
    cell: ({ row }) =>
      row.original.validado ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
];
