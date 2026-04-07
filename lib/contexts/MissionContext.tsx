"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getMisionesLite } from "@/lib/queries/misiones";
import type { Mision } from "@/lib/supabase/types";

// =============================================================================
// Tipos
// =============================================================================

type MisionLite = Pick<Mision, "id" | "nombre">;

interface MissionContextValue {
  /** Lista de misiones disponibles. */
  misiones: MisionLite[];
  /** Misión seleccionada actualmente, o null si "Todas". */
  selectedMisionId: string | null;
  selectedMision: MisionLite | null;
  /** Cambia la misión seleccionada (null = "Todas"). */
  setSelectedMisionId: (id: string | null) => void;
  /** Recarga la lista de misiones desde Supabase. */
  refreshMisiones: () => Promise<void>;
  loading: boolean;
}

// =============================================================================
// Context
// =============================================================================

const MissionContext = createContext<MissionContextValue | null>(null);

const STORAGE_KEY = "ecos:selected_mision_id";

export function useMission() {
  const ctx = useContext(MissionContext);
  if (!ctx) {
    throw new Error("useMission debe usarse dentro de <MissionProvider>");
  }
  return ctx;
}

// =============================================================================
// Provider
// =============================================================================

export function MissionProvider({ children }: { children: React.ReactNode }) {
  const [misiones, setMisiones] = useState<MisionLite[]>([]);
  const [selectedMisionId, setSelectedMisionIdState] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  // Carga inicial de misiones + restauración de la última selección
  const refreshMisiones = useCallback(async () => {
    setLoading(true);
    const { data } = await getMisionesLite();
    setMisiones(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshMisiones();
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setSelectedMisionIdState(stored);
    }
  }, [refreshMisiones]);

  // Persiste la selección entre sesiones
  const setSelectedMisionId = useCallback((id: string | null) => {
    setSelectedMisionIdState(id);
    if (typeof window === "undefined") return;
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const selectedMision =
    misiones.find((m) => m.id === selectedMisionId) ?? null;

  return (
    <MissionContext.Provider
      value={{
        misiones,
        selectedMisionId,
        selectedMision,
        setSelectedMisionId,
        refreshMisiones,
        loading,
      }}
    >
      {children}
    </MissionContext.Provider>
  );
}
