import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppProviders } from "@/components/providers/AppProviders";
import { getCurrentUserWithRoles } from "@/lib/auth/getCurrentUser";
import { canAccessPanel } from "@/lib/auth/roles";

// =============================================================================
// Layout de /admin — defensa en profundidad (además del middleware).
//
// Nota de alcance (Fase 05): se introduce el espacio /admin solo para alojar
// la visualización del grafo, con la misma protección que /dashboard
// (PANEL_ROLES). La separación admin/público completa (login propio, portal)
// corresponde a la Fase 06.
// =============================================================================

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentUserWithRoles();
  if (!current) {
    redirect("/login");
  }
  if (!canAccessPanel(current.roles)) {
    redirect("/login?reason=no_panel_access");
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
