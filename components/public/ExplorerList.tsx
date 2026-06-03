"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { PublicEntityType, PublicFilterOption } from "@/lib/queries/public";

export interface ExplorerItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  filterValue: string | null;
}

interface Props {
  type: PublicEntityType;
  items: ExplorerItem[];
  filter?: { label: string; options: PublicFilterOption[] };
}

/**
 * Lista pública con búsqueda (por nombre) y filtro opcional (por enum), todo en
 * cliente sobre los datos servidos por SSR. Cada elemento enlaza a su ficha.
 */
export function ExplorerList({ type, items, filter }: Props) {
  const [query, setQuery] = useState("");
  const [filterValue, setFilterValue] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const matchesQuery = !q || it.title.toLowerCase().includes(q);
      const matchesFilter = !filterValue || it.filterValue === filterValue;
      return matchesQuery && matchesFilter;
    });
  }, [items, query, filterValue]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre…"
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        {filter && (
          <select
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            aria-label={filter.label}
          >
            <option value="">Todos · {filter.label}</option>
            {filter.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="text-xs text-slate-400">
        {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-400">
          No hay elementos públicos que coincidan.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((it) => (
            <li key={it.id}>
              <Link
                href={`/explorar/${type}/${it.id}`}
                className="block h-full rounded-lg border border-slate-200 p-4 transition-colors hover:border-brand-300 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-slate-900">{it.title}</h3>
                  {it.badge && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {it.badge}
                    </span>
                  )}
                </div>
                {it.subtitle && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {it.subtitle}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
