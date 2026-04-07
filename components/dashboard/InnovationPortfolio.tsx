"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMission } from "@/lib/contexts/MissionContext";
import {
  getInnovacionesPortfolio,
  type InnovacionStatRow,
} from "@/lib/queries/portfolio";
import type {
  EstadoInnovacion,
  NivelImpacto,
} from "@/lib/supabase/types";

// =============================================================================
// Configuración de ejes y colores
// =============================================================================

const ESTADOS: { value: EstadoInnovacion; label: string }[] = [
  { value: "diseno", label: "Diseño" },
  { value: "prototipo", label: "Prototipo" },
  { value: "implementacion", label: "Implementación" },
  { value: "testeado", label: "Testeado" },
  { value: "escalado", label: "Escalado" },
];

const IMPACTOS: { value: NivelImpacto; label: string; color: string }[] = [
  { value: "comunitaria", label: "Comunitaria", color: "#cbd5e1" },
  { value: "local", label: "Local", color: "#93c5fd" },
  { value: "autonomica", label: "Autonómica", color: "#a78bfa" },
  { value: "estatal", label: "Estatal", color: "#f59e0b" },
  { value: "internacional", label: "Internacional", color: "#10b981" },
];

// Tipo de cada barra (una por estado, con un campo por nivel de impacto)
type ChartRow = {
  estado: string;
  total: number;
} & Record<NivelImpacto, number>;

// =============================================================================
// Componente
// =============================================================================

export function InnovationPortfolio() {
  const { selectedMisionId, selectedMision } = useMission();
  const [rows, setRows] = useState<InnovacionStatRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getInnovacionesPortfolio(selectedMisionId).then((data) => {
      if (cancelled) return;
      setRows(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedMisionId]);

  // Agrega: una fila por estado, con un contador por nivel de impacto
  const chartData = useMemo<ChartRow[]>(() => {
    return ESTADOS.map(({ value, label }) => {
      const base: ChartRow = {
        estado: label,
        total: 0,
        comunitaria: 0,
        local: 0,
        autonomica: 0,
        estatal: 0,
        internacional: 0,
      };
      for (const r of rows) {
        if (r.estado !== value) continue;
        base.total += 1;
        if (r.nivel_impacto) base[r.nivel_impacto] += 1;
      }
      return base;
    });
  }, [rows]);

  const total = rows.length;
  const balanceHint = useMemo(() => buildBalanceHint(chartData), [chartData]);

  // ---------------------------------------------------------------------------
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Cartera de innovación
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Distribución por estado y nivel de impacto. Una cartera equilibrada
            tiene innovaciones en todas las fases del ciclo.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums text-slate-900">
            {total}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">
            innovaciones
            {selectedMision && ` · ${selectedMision.nombre}`}
          </p>
        </div>
      </header>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : total === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No hay innovaciones que mostrar"
          description={
            selectedMision
              ? "Esta misión todavía no tiene innovaciones vinculadas."
              : "Crea innovaciones para visualizar la cartera."
          }
        />
      ) : (
        <>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="estado"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{
                    fontSize: "12px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    padding: "6px 10px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  iconType="square"
                  iconSize={8}
                />
                {IMPACTOS.map((imp) => (
                  <Bar
                    key={imp.value}
                    dataKey={imp.value}
                    name={imp.label}
                    stackId="impacto"
                    fill={imp.color}
                    radius={[0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {balanceHint && (
            <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
              💡 {balanceHint}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// Heurística simple para sugerir si la cartera está equilibrada
// =============================================================================

function buildBalanceHint(data: ChartRow[]): string | null {
  const totals = data.map((d) => d.total);
  const overall = totals.reduce((a, b) => a + b, 0);
  if (overall === 0) return null;

  const empty = data.filter((d) => d.total === 0).map((d) => d.estado);
  if (empty.length === ESTADOS.length) return null;

  if (empty.length >= 3) {
    return `Cartera concentrada en pocas fases. Faltan innovaciones en: ${empty.join(", ")}.`;
  }
  if (empty.length > 0) {
    return `Falta cobertura en las fases: ${empty.join(", ")}.`;
  }

  // Detecta concentración: si una fase supera el 60% del total
  const max = Math.max(...totals);
  const dominantIdx = totals.indexOf(max);
  if (max / overall > 0.6) {
    return `La cartera está concentrada en "${data[dominantIdx].estado}" (${Math.round((max / overall) * 100)}%).`;
  }

  return "Cartera distribuida en todas las fases del ciclo. ✓";
}
