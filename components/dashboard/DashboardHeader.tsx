"use client";

import { Target } from "lucide-react";
import { useMission } from "@/lib/contexts/MissionContext";

/**
 * Cabecera del dashboard. Muestra título + descripción y un indicador
 * sutil de la misión activa (sincronizado con el selector del Topbar).
 */
export function DashboardHeader() {
  const { selectedMision } = useMission();

  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Visión estratégica del ecosistema ECOS.
        </p>
      </div>
      {selectedMision && (
        <div className="flex items-center gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-2">
          <Target className="h-4 w-4 text-brand-600" />
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-600">
              Misión activa
            </p>
            <p className="text-xs font-medium text-brand-900">
              {selectedMision.nombre}
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
