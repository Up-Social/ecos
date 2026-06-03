import { GraphClient } from "@/components/graph/GraphClient";

// =============================================================================
// /admin/graph — Visualización (solo lectura) del grafo de conocimiento.
// Protegida por el middleware (plano admin) y el layout de (panel).
// =============================================================================

export default function GraphPage() {
  return (
    <div className="h-full">
      <GraphClient />
    </div>
  );
}
