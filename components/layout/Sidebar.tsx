"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Target,
  Flag,
  Lightbulb,
  Microscope,
  Megaphone,
  FileSpreadsheet,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: "",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Mapeo",
    items: [
      { href: "/dashboard/agentes", label: "Agentes", icon: Users },
      { href: "/dashboard/proyectos", label: "Proyectos", icon: FolderKanban },
    ],
  },
  {
    title: "Propósito",
    items: [
      { href: "/dashboard/misiones", label: "Misiones", icon: Target },
      { href: "/dashboard/retos", label: "Retos", icon: Flag },
    ],
  },
  {
    title: "Experimentación",
    items: [
      { href: "/dashboard/innovaciones", label: "Innovaciones", icon: Lightbulb },
    ],
  },
  {
    title: "Aprendizaje",
    items: [
      { href: "/dashboard/hallazgos", label: "Hallazgos", icon: Microscope },
    ],
  },
  {
    title: "Transferencia",
    items: [
      { href: "/dashboard/recomendaciones", label: "Recomendaciones", icon: Megaphone },
    ],
  },
  {
    title: "Importación",
    items: [
      { href: "/dashboard/importar", label: "Importar Excel", icon: FileSpreadsheet },
      { href: "/dashboard/logs", label: "Logs", icon: ListChecks },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center border-b border-slate-200 px-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
            E
          </div>
          <span className="text-sm font-semibold text-slate-900">ECOS</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {sections.map((section, idx) => (
          <div key={idx} className="mb-4">
            {section.title && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          active ? "text-brand-600" : "text-slate-400",
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
