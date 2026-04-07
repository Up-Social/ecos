"use client";

import { useEffect, useRef, useState } from "react";
import { Target, Check, ChevronDown } from "lucide-react";
import { useMission } from "@/lib/contexts/MissionContext";
import { cn } from "@/lib/utils";

export function MissionSelector() {
  const { misiones, selectedMisionId, selectedMision, setSelectedMisionId } =
    useMission();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function select(id: string | null) {
    setSelectedMisionId(id);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          selectedMisionId
            ? "border-brand-300 bg-brand-50 text-brand-700"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Target className="h-3.5 w-3.5" />
        <span className="max-w-[180px] truncate">
          {selectedMision ? selectedMision.nombre : "Todas las misiones"}
        </span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
        >
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Filtrar por misión
            </p>
          </div>
          <ul className="max-h-72 overflow-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => select(null)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-slate-50",
                  !selectedMisionId && "bg-brand-50 text-brand-700",
                )}
              >
                <span className="font-medium">Todas las misiones</span>
                {!selectedMisionId && <Check className="h-4 w-4" />}
              </button>
            </li>
            {misiones.length > 0 && (
              <li
                aria-hidden="true"
                className="my-1 border-t border-slate-100"
              />
            )}
            {misiones.map((m) => {
              const active = m.id === selectedMisionId;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => select(m.id)}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-slate-50",
                      active && "bg-brand-50 text-brand-700",
                    )}
                  >
                    <span className="truncate">{m.nombre}</span>
                    {active && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                </li>
              );
            })}
            {misiones.length === 0 && (
              <li className="px-3 py-2 text-xs text-slate-400">
                No hay misiones todavía
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
