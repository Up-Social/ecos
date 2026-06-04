import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getPublicCounts,
  PUBLIC_ENTITY_CONFIG,
  PUBLIC_ENTITY_TYPES,
} from "@/lib/queries/public";
import { getMapaDataset, getMapaEtiquetas } from "@/lib/queries/mapa";
import { MapaExplorador } from "@/components/mapa/MapaExplorador";

// =============================================================================
// /explorar — hub del portal: lista las categorías explorables.
// =============================================================================

export const metadata: Metadata = {
  title: "Explorar — ECOS",
  description:
    "Explora las misiones, retos, agentes, proyectos e innovaciones del ecosistema ECOS.",
};

export default async function ExplorarHubPage() {
  const supabase = await createClient();
  const [counts, mapa, etiquetas] = await Promise.all([
    getPublicCounts(supabase),
    getMapaDataset(supabase),
    getMapaEtiquetas(supabase),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">Explorar</h1>
      <p className="mt-1 text-sm text-slate-500">
        Recorre las categorías del ecosistema.
      </p>

      <div className="mt-8">
        <MapaExplorador puntos={mapa.data} etiquetas={etiquetas} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
