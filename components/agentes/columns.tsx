"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Agente, TipoAgente } from "@/lib/supabase/types";

const tipoLabel: Record<TipoAgente, string> = {
  sociedad_civil: "Sociedad civil",
  sector_publico: "Sector público",
  academia: "Academia",
  sector_privado: "Sector privado",
};

const tipoTone: Record<TipoAgente, "blue" | "green" | "purple" | "amber"> = {
  sociedad_civil: "blue",
  sector_publico: "green",
  academia: "purple",
  sector_privado: "amber",
};

export const agentesColumns: ColumnDef<Agente>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <span className="font-medium text-slate-900">{row.original.nombre}</span>
    ),
  },
  {
    accessorKey: "tipo_agente",
    header: "Tipo",
    cell: ({ row }) => {
      const t = row.original.tipo_agente;
      if (!t) return <span className="text-slate-400">—</span>;
      return <Badge tone={tipoTone[t]}>{tipoLabel[t]}</Badge>;
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) =>
      row.original.email ? (
        <a
          href={`mailto:${row.original.email}`}
          onClick={(e) => e.stopPropagation()}
          className="text-slate-700 hover:text-brand-600"
        >
          {row.original.email}
        </a>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    accessorKey: "web",
    header: "Web",
    cell: ({ row }) =>
      row.original.web ? (
        <a
          href={row.original.web}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-slate-700 hover:text-brand-600"
        >
          {row.original.web.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
];
