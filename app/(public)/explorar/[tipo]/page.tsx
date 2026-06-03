import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  isPublicEntityType,
  listPublicEntities,
  toListItem,
  PUBLIC_ENTITY_CONFIG,
} from "@/lib/queries/public";
import { ExplorerList, type ExplorerItem } from "@/components/public/ExplorerList";

// =============================================================================
// /explorar/[tipo] — listado público de una categoría con búsqueda y filtros.
// SSR (anon bajo RLS public_read); el filtrado/búsqueda es client-side.
// =============================================================================

interface Params {
  params: Promise<{ tipo: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tipo } = await params;
  if (!isPublicEntityType(tipo)) return { title: "Explorar — ECOS" };
  const cfg = PUBLIC_ENTITY_CONFIG[tipo];
  return {
    title: `${cfg.label} — ECOS`,
    description: `Explora ${cfg.label.toLowerCase()} públicas del ecosistema ECOS.`,
  };
}

export default async function ExplorarTipoPage({ params }: Params) {
  const { tipo } = await params;
  if (!isPublicEntityType(tipo)) notFound();

  const cfg = PUBLIC_ENTITY_CONFIG[tipo];
  const supabase = await createClient();
  const { data } = await listPublicEntities(supabase, tipo);

  const items: ExplorerItem[] = data.map((row) => toListItem(tipo, row));

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/explorar"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ChevronLeft className="h-4 w-4" />
        Explorar
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-slate-900">
        {cfg.label}
      </h1>

      <div className="mt-6">
        <ExplorerList
          type={tipo}
          items={items}
          filter={
            cfg.filter
              ? { label: cfg.filter.label, options: cfg.filter.options }
              : undefined
          }
        />
      </div>
    </div>
  );
}
