"use client";

import { LogOut } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MissionSelector } from "./MissionSelector";

interface Props {
  email: string;
}

const labels: Record<string, string> = {
  dashboard: "Dashboard",
  agentes: "Agentes",
  proyectos: "Proyectos",
  misiones: "Misiones",
  retos: "Retos",
  innovaciones: "Innovaciones",
  hallazgos: "Hallazgos",
  recomendaciones: "Recomendaciones",
  importar: "Importar Excel",
  logs: "Logs",
};

export function Topbar({ email }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const segments = pathname.split("/").filter(Boolean);
  const current =
    segments.length > 1
      ? labels[segments[segments.length - 1]] ?? segments[segments.length - 1]
      : "Dashboard";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-slate-900">{current}</span>
      </div>
      <div className="flex items-center gap-4">
        <MissionSelector />
        <div className="h-5 w-px bg-slate-200" aria-hidden="true" />
        <span className="text-xs text-slate-500">{email}</span>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut className="h-3.5 w-3.5" />
          Salir
        </button>
      </div>
    </header>
  );
}
