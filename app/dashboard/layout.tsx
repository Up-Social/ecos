import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AppProviders } from "@/components/providers/AppProviders";
import { getCurrentUserWithRoles } from "@/lib/auth/getCurrentUser";
import { canAccessPanel } from "@/lib/auth/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Doble check además del middleware (defensa en profundidad)
  const current = await getCurrentUserWithRoles();
  if (!current) {
    redirect("/login");
  }
  if (!canAccessPanel(current.roles)) {
    redirect("/login?reason=no_panel_access");
  }

  return (
    <AppProviders>
      <div className="flex h-screen bg-slate-50">
        <Sidebar roles={current.roles} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar email={current.user.email ?? ""} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
          </main>
        </div>
      </div>
    </AppProviders>
  );
}
