"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Sparkles } from "lucide-react";
import {
  getGraphData,
  type GraphData,
} from "@/lib/queries/relationships";
import { ENTITY_TYPES, ENTITY_TYPE_LABELS } from "@/lib/schemas/relationship";
import type { EntityType } from "@/lib/supabase/types";

// Color por tipo de entidad (consistente con la paleta del panel).
const TYPE_COLORS: Record<EntityType, string> = {
  misiones: "#7c3aed", // violeta
  retos: "#2563eb", // azul
  agentes: "#0891b2", // cian
  proyectos: "#d97706", // ámbar
  innovaciones: "#16a34a", // verde
  hallazgos: "#db2777", // rosa
  recomendaciones: "#475569", // slate
};

// Layout determinista: una columna por tipo, nodos apilados en vertical.
const COL_W = 280;
const ROW_H = 78;
const X0 = 40;
const Y0 = 40;

export function GraphClient() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [visibleTypes, setVisibleTypes] = useState<Set<EntityType>>(
    new Set(ENTITY_TYPES),
  );
  const [hiddenRelCodes, setHiddenRelCodes] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Carga
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getGraphData()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else setData(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Tipos de relación presentes (para el filtro).
  const relTypes = useMemo(() => {
    if (!data) return [] as { code: string; label: string }[];
    const map = new Map<string, string>();
    for (const e of data.edges) if (e.typeCode) map.set(e.typeCode, e.label);
    return Array.from(map, ([code, label]) => ({ code, label }));
  }, [data]);

  // Posiciones deterministas por tipo de entidad.
  const positions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    if (!data) return pos;
    const counters: Record<string, number> = {};
    for (const n of data.nodes) {
      const colIndex = ENTITY_TYPES.indexOf(n.entityType);
      const row = counters[n.entityType] ?? 0;
      counters[n.entityType] = row + 1;
      pos[n.id] = { x: X0 + colIndex * COL_W, y: Y0 + row * ROW_H };
    }
    return pos;
  }, [data]);

  // ---------------------------------------------------------------------------
  // Nodos y aristas de React Flow (aplicando filtros y selección)
  // ---------------------------------------------------------------------------
  const { rfNodes, rfEdges } = useMemo(() => {
    if (!data) return { rfNodes: [] as Node[], rfEdges: [] as Edge[] };

    const visibleNodeIds = new Set(
      data.nodes.filter((n) => visibleTypes.has(n.entityType)).map((n) => n.id),
    );

    const rfNodes: Node[] = data.nodes
      .filter((n) => visibleTypes.has(n.entityType))
      .map((n) => {
        const color = TYPE_COLORS[n.entityType];
        const selected = n.id === selectedId;
        return {
          id: n.id,
          position: positions[n.id] ?? { x: 0, y: 0 },
          data: { label: n.label },
          style: {
            borderRadius: 8,
            border: `2px solid ${selected ? "#0f172a" : color}`,
            background: selected ? color : "#ffffff",
            color: selected ? "#ffffff" : "#0f172a",
            fontSize: 12,
            padding: "6px 10px",
            width: 200,
            boxShadow: selected ? "0 0 0 3px rgba(15,23,42,0.15)" : undefined,
          },
        };
      });

    const rfEdges: Edge[] = data.edges
      .filter(
        (e) =>
          !hiddenRelCodes.has(e.typeCode) &&
          visibleNodeIds.has(e.source) &&
          visibleNodeIds.has(e.target),
      )
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        labelStyle: { fontSize: 10, fill: "#64748b" },
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "#94a3b8" },
      }));

    return { rfNodes, rfEdges };
  }, [data, visibleTypes, hiddenRelCodes, selectedId, positions]);

  // Nodo seleccionado + sus vecinos (para el panel de detalle).
  const detail = useMemo(() => {
    if (!data || !selectedId) return null;
    const node = data.nodes.find((n) => n.id === selectedId);
    if (!node) return null;
    const connections = data.edges
      .filter((e) => e.source === selectedId || e.target === selectedId)
      .map((e) => {
        const outgoing = e.source === selectedId;
        const otherId = outgoing ? e.target : e.source;
        const other = data.nodes.find((n) => n.id === otherId);
        return {
          id: e.id,
          relation: e.label,
          direction: outgoing ? ("saliente" as const) : ("entrante" as const),
          otherLabel: other?.label ?? otherId,
          otherType: other?.entityType,
        };
      });
    return { node, connections };
  }, [data, selectedId]);

  // ---------------------------------------------------------------------------
  // Helpers de filtros
  // ---------------------------------------------------------------------------
  function toggleType(t: EntityType) {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function toggleRelCode(code: string) {
    setHiddenRelCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex h-full">
      {/* Panel de filtros */}
      <aside className="w-60 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-brand-600" />
          Grafo de conocimiento
        </h2>

        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Tipos de entidad
        </p>
        <ul className="mb-4 space-y-1">
          {ENTITY_TYPES.map((t) => (
            <li key={t}>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={visibleTypes.has(t)}
                  onChange={() => toggleType(t)}
                />
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: TYPE_COLORS[t] }}
                />
                {ENTITY_TYPE_LABELS[t]}
              </label>
            </li>
          ))}
        </ul>

        {relTypes.length > 0 && (
          <>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Tipos de relación
            </p>
            <ul className="space-y-1">
              {relTypes.map((rt) => (
                <li key={rt.code}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={!hiddenRelCodes.has(rt.code)}
                      onChange={() => toggleRelCode(rt.code)}
                    />
                    {rt.label}
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>

      {/* Lienzo */}
      <div className="relative h-full flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Cargando grafo…
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-sm text-red-600">
            {error}
          </div>
        ) : rfNodes.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">
            No hay relaciones que mostrar. Crea relaciones desde la pestaña
            «Relaciones» de cualquier entidad.
          </div>
        ) : (
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            nodesConnectable={false}
            elementsSelectable
            fitView
            minZoom={0.1}
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        )}
      </div>

      {/* Panel de detalle del nodo seleccionado */}
      {detail && (
        <aside className="w-72 shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {ENTITY_TYPE_LABELS[detail.node.entityType]}
          </p>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            {detail.node.label}
          </h3>

          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Relaciones ({detail.connections.length})
          </p>
          {detail.connections.length === 0 ? (
            <p className="text-xs text-slate-400">Sin relaciones.</p>
          ) : (
            <ul className="space-y-2">
              {detail.connections.map((c) => (
                <li
                  key={c.id}
                  className="rounded-md border border-slate-200 p-2 text-xs"
                >
                  <span className="text-slate-500">
                    {c.direction === "saliente" ? "→ " : "← "}
                    {c.relation}
                  </span>
                  <div className="mt-0.5 font-medium text-slate-800">
                    {c.otherType ? ENTITY_TYPE_LABELS[c.otherType] + ": " : ""}
                    {c.otherLabel}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </div>
  );
}
