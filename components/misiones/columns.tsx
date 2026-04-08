"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Mision } from "@/lib/supabase/types";

export const misionesColumns: ColumnDef<Mision>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    meta: { width: "40%" },
    cell: ({ row }) => (
      <span className="block whitespace-normal break-words font-medium text-slate-900">
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
];
