"use client";

import type { Columna } from "@/components/data-table/features";
import { Badge } from "@/components/ui/Badge";
import type { Mision } from "@/lib/supabase/types";

export const misionesColumns: Columna<Mision>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    meta: { width: "40%" },
    cell: ({ row }) => (
      <span className="block whitespace-normal wrap-break-word font-medium text-slate-900">
        {row.original.nombre}
      </span>
    ),
  },
  {
    accessorKey: "problema",
    header: "Problema",
    meta: { width: "30%" },
    cell: ({ row }) =>
      row.original.problema ? (
        <span className="line-clamp-2 text-slate-700">{row.original.problema}</span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    accessorKey: "descripcion",
    header: "Descripción",
    meta: { width: "30%" },
    cell: ({ row }) =>
      row.original.descripcion ? (
        <span className="line-clamp-2 text-slate-700">
          {row.original.descripcion}
        </span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    accessorKey: "is_public",
    header: "Visibilidad",
    meta: { width: "7rem" },
    cell: ({ row }) =>
      row.original.is_public ? (
        <Badge tone="green">Público</Badge>
      ) : (
        <Badge tone="slate">Privado</Badge>
      ),
  },
];
