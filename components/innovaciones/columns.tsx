"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/Badge";
import type {
  InnovacionConRelaciones,
  EstadoInnovacion,
} from "@/lib/supabase/types";

const estadoTone: Record<
  EstadoInnovacion,
  "slate" | "blue" | "amber" | "green" | "purple"
> = {
  diseno: "slate",
  prototipo: "blue",
  implementacion: "amber",
  testeado: "green",
  escalado: "purple",
};

const estadoLabel: Record<EstadoInnovacion, string> = {
  diseno: "Diseño",
  prototipo: "Prototipo",
  implementacion: "Implementación",
  testeado: "Testeado",
  escalado: "Escalado",
};

export const innovacionesColumns: ColumnDef<InnovacionConRelaciones>[] = [
  {
    accessorKey: "external_id",
    header: "ID",
    meta: { width: "6rem" },
    cell: ({ row }) =>
      row.original.external_id ? (
        <span className="font-mono text-xs text-slate-500">
          {row.original.external_id}
        </span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    accessorKey: "nombre",
    header: "Nombre",
    meta: { width: "50%" },
    cell: ({ row }) => (
      <div className="font-medium text-slate-900">{row.original.nombre}</div>
    ),
  },
  {
    id: "proyecto",
    header: "Proyecto",
    meta: { width: "30%" },
    cell: ({ row }) => (
      <span className="text-slate-700">
        {row.original.proyecto?.nombre ?? (
          <span className="text-slate-400">—</span>
        )}
      </span>
    ),
  },
  {
    accessorKey: "estado",
    header: "Estado",
    meta: { width: "9rem" },
    cell: ({ row }) => {
      const e = row.original.estado;
      if (!e) return <span className="text-slate-400">—</span>;
      return <Badge tone={estadoTone[e]}>{estadoLabel[e]}</Badge>;
    },
  },
  {
    id: "retos",
    header: "Retos",
    meta: { width: "5rem" },
    cell: ({ row }) => {
      const n = row.original.retos.length;
      return n > 0 ? (
        <Badge tone="slate">{n}</Badge>
      ) : (
        <span className="text-slate-400">—</span>
      );
    },
  },
];
