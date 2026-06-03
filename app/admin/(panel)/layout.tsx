import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppProviders } from "@/components/providers/AppProviders";
import { getCurrentUserWithRoles } from "@/lib/auth/getCurrentUser";
import { canAccessPanel } from "@/lib/auth/roles";

// =============================================================================
// Layout del plano de ADMINISTRACIÓN guardado — defensa en profundidad.
//
// Cubre las rutas administrativas bajo /admin que requieren PANEL_ROLES
// (p.ej. /admin y /admin/graph). El login /admin/login queda FUERA de este
// route group, por lo que es accesible sin sesión.
//
// Nota: el panel principal sigue en /dashboard/* (su propio layout). La
// migración del panel a /admin es una decisión pendiente (ver
// PRE_IMPLEMENTATION_ANALYSIS de la Fase 06).
// =============================================================================

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentUserWithRoles();
  if (!current) {
    redirect("/admin/login");
  }
  if (!canAccessPanel(current.roles)) {
    redirect("/admin/login?reason=no_panel_access");
  }

  return (
    <AppProviders>
      <div className="flex h-screen flex-col bg-slate-50">
        <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al panel
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-900">
            Administración
          </span>
        </header>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </AppProviders>
  );
}
