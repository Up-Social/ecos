import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getPublicCounts,
  PUBLIC_ENTITY_CONFIG,
  PUBLIC_ENTITY_TYPES,
} from "@/lib/queries/public";

// =============================================================================
// Home pública `/`. Server Component (SSR/SEO). Muestra accesos a las
// categorías explorables con su conteo de elementos públicos.
// =============================================================================

export const metadata: Metadata = {
  title: "ECOS — Ecosistema de cambio social",
  description:
    "Explora el ecosistema de cambio social: misiones, retos, agentes, proyectos e innovaciones que impulsan la transformación.",
};

export default async function PublicHomePage() {
  const supabase = await createClient();
  const counts = await getPublicCounts(supabase);

  return (
    <>
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Ecosistema de cambio social
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">
            ECOS mapea misiones, retos, agentes, proyectos e innovaciones que
            impulsan la transformación social. Explora el ecosistema abierto.
          </p>
          <div className="mt-8 flex items-center justify-center">
            <Link
              href="/explorar"
              className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Explorar el ecosistema
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PUBLIC_ENTITY_TYPES.map((type) => {
            const cfg = PUBLIC_ENTITY_CONFIG[type];
            return (
              <Link
                key={type}
                href={`/explorar/${type}`}
                className="group rounded-lg border border-slate-200 p-5 transition-colors hover:border-brand-300 hover:bg-slate-50"
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {cfg.label}
                  </h2>
                  <span className="text-2xl font-semibold text-brand-600">
                    {counts[type]}
                  </span>
                </div>
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500 group-hover:text-brand-600">
                  Ver {cfg.label.toLowerCase()}
                  <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
