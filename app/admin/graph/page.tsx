import { GraphClient } from "@/components/graph/GraphClient";

// =============================================================================
// /admin/graph — Visualización (solo lectura) del grafo de conocimiento.
// Protegida por el middleware (PANEL_ROLES) y el layout de /admin.
// =============================================================================

export default function GraphPage() {
  return (
    <div className="h-full">
      <GraphClient />
    </div>
  );
}
