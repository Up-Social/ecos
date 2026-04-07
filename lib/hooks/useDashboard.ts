"use client";

import { useEffect, useState } from "react";
import {
  getDashboardSnapshot,
  type DashboardSnapshot,
} from "@/lib/queries/dashboard";

interface UseDashboardResult {
  data: DashboardSnapshot | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Carga el snapshot completo del dashboard (9 vistas en paralelo) para una
 * misión dada. Reactivo: si misionId cambia, recarga.
 */
export function useDashboard(misionId: string | null): UseDashboardResult {
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!misionId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snapshot = await getDashboardSnapshot(misionId);
      setData(snapshot);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    if (!misionId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    getDashboardSnapshot(misionId)
      .then((snapshot) => {
        if (cancelled) return;
        setData(snapshot);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.message ?? "Error cargando dashboard");
        setData(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [misionId]);

  return { data, loading, error, reload: load };
}
