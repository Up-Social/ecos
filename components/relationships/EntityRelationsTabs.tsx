"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { EntityType } from "@/lib/supabase/types";
import { RelationshipsTab } from "./RelationshipsTab";

interface Props {
  entityType: EntityType;
  /** Id de la entidad (null en modo alta → no se muestran pestañas). */
  entityId: string | null | undefined;
  /** Contenido de la pestaña "Datos" (el formulario actual del drawer). */
  children: React.ReactNode;
}

/**
 * Envuelve el contenido de un drawer de entidad en dos pestañas:
 *   - "Datos": el contenido actual (formulario), sin cambios.
 *   - "Relaciones": CRUD del Knowledge Graph para la entidad.
 *
 * La pestaña "Relaciones" solo aparece en edición (cuando la entidad ya existe);
 * en alta se renderiza únicamente el contenido de "Datos".
 */
export function EntityRelationsTabs({ entityType, entityId, children }: Props) {
  const [tab, setTab] = useState<"datos" | "relaciones">("datos");

  // En modo alta (sin id) no tiene sentido relacionar: solo el formulario.
  if (!entityId) return <>{children}</>;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Secciones de la entidad"
        className="flex gap-1 border-b border-slate-200"
      >
        <TabButton
          active={tab === "datos"}
          onClick={() => setTab("datos")}
          label="Datos"
        />
        <TabButton
          active={tab === "relaciones"}
          onClick={() => setTab("relaciones")}
          label="Relaciones"
        />
      </div>

      <div role="tabpanel" hidden={tab !== "datos"}>
        {children}
      </div>
      {tab === "relaciones" && (
        <div role="tabpanel">
          <RelationshipsTab entityType={entityType} entityId={entityId} />
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        active
          ? "border-brand-600 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-700",
      )}
    >
      {label}
    </button>
  );
}
