import { redirect } from "next/navigation";

// =============================================================================
// `/admin` — entrada del plano de administración.
// El panel vive en /dashboard; esta entrada redirige allí (compatibilidad).
// =============================================================================

export default function AdminHomePage() {
  redirect("/dashboard");
}
