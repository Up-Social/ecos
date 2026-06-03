import { redirect } from "next/navigation";
import { getCurrentUserWithRoles } from "@/lib/auth/getCurrentUser";
import { AsistenteClient } from "@/components/asistente/AsistenteClient";

// =============================================================================
// Asistente GraphRAG `/asistente` (plano público, requiere sesión).
// La protección la aplica el middleware; aquí, doble verificación (defensa en
// profundidad), como en el layout del panel.
// =============================================================================

export default async function AsistentePage() {
  const current = await getCurrentUserWithRoles();
  if (!current) redirect("/login?redirect=/asistente");
  return <AsistenteClient />;
}
