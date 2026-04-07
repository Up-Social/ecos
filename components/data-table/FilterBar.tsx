"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Tipos
// =============================================================================

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef<T> {
  id: string;
  label: string;
  options: FilterOption[];
  /** Cómo evaluar si una fila cumple el filtro con un valor dado. */
  predicate: (row: T, value: string) => boolean;
}

export type FilterValues = Record<string, string | null>;

interface Props<T> {
  filters: FilterDef<T>[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
}

// =============================================================================
// FilterBar
// =============================================================================

export function FilterBar<T>({ filters, values, onChange }: Props<T>) {
  const activeCount = Object.values(values).filter((v) => v).length;

  function setValue(id: string, value: string | null) {
    onChange({ ...values, [id]: value });
  }

  function clearAll() {
    onChange({});
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Filter className="h-3.5 w-3.5" />
        <span>Filtros:</span>
      </div>
      {filters.map((f) => (
        <FilterPill
          key={f.id}
          filter={f}
          value={values[f.id] ?? null}
          onChange={(v) => setValue(f.id, v)}
        />
      ))}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}

// =============================================================================
// FilterPill — botón con popover de opciones
// =============================================================================

interface PillProps<T> {
  filter: FilterDef<T>;
  value: string | null;
  onChange: (value: string | null) => void;
}

function FilterPill<T>({ filter, value, onChange }: PillProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = filter.options.find((o) => o.value === value) ?? null;
  const filtered = filter.options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );
  const active = !!value;

  return (
    <div ref={ref} className="relative">
      <div
        className={cn(
          "flex items-center gap-1 rounded-full border text-xs transition-colors",
          active
            ? "border-brand-300 bg-brand-50 text-brand-700"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 py-1 pl-3 pr-2 font-medium"
        >
          <span>{filter.label}</span>
          {selected ? (
            <>
              <span className="text-slate-400">·</span>
              <span>{selected.label}</span>
            </>
          ) : (
            <span className="text-slate-400">Todos</span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {active && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-full p-0.5 pr-2 text-brand-600 hover:text-brand-800"
            aria-label="Quitar filtro"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-slate-200 bg-white shadow-lg">
          <input
            type="text"
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-b border-slate-100 px-3 py-2 text-xs focus:outline-none"
          />
          <ul className="max-h-60 overflow-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-slate-400">Sin resultados</li>
            )}
            {filtered.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-50",
                    isSelected && "bg-brand-50 text-brand-700",
                  )}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="h-3 w-3" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
