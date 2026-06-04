import Link from "next/link";
import { LogIn, Sparkles, UserRound, LayoutDashboard } from "lucide-react";
import { getCurrentUserWithRoles } from "@/lib/auth/getCurrentUser";
import { canAccessPanel } from "@/lib/auth/roles";

// =============================================================================
// Layout del Portal Público (plano `/`).
// La navegación se adapta a la sesión: sin sesión muestra el acceso a
// administración; con sesión muestra "Mi cuenta" y, si el usuario tiene rol de
// panel, un enlace DIRECTO a /dashboard (navegación fluida sin re-login).
// =============================================================================

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentUserWithRoles();
  const isPanel = current ? canAccessPanel(current.roles) : false;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
              E
            </div>
            <span className="text-sm font-semibold text-slate-900">ECOS</span>
          </Link>
          <nav className="flex items-center gap-5">
            <Link
              href="/explorar"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Explorar
            </Link>
            <Link
              href="/asistente"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <Sparkles className="h-4 w-4" />
              Asistente
            </Link>

            {current ? (
              <>
                {isPanel && (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Panel
                  </Link>
                )}
                <Link
                  href="/perfil"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  <UserRound className="h-4 w-4" />
                  Mi cuenta
                </Link>
              </>
            ) : (
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <LogIn className="h-4 w-4" />
                Acceso administración
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-slate-400">
          ECOS · UpSocial
        </div>
      </footer>
    </div>
  );
}
