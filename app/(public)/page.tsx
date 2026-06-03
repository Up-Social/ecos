import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

// =============================================================================
// Home pública `/`. Estructura mínima (sin datos ni sesión).
// El portal navegable (Explorador, fichas de entidad, búsqueda) es la Fase 08.
// =============================================================================

export const metadata: Metadata = {
  title: "ECOS — Ecosistema de cambio social",
  description:
    "Portal público de ECOS: misiones, retos, agentes, proyectos e innovaciones del ecosistema de cambio social.",
};

export default function PublicHomePage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        Ecosistema de cambio social
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">
        ECOS mapea misiones, retos, agentes, proyectos e innovaciones que impulsan
        la transformación social. El portal público estará disponible próximamente.
      </p>

      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Acceso administración
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
