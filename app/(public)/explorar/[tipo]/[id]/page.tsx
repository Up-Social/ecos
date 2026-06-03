import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  isPublicEntityType,
  getPublicEntity,
  getEntityDetailFields,
  PUBLIC_ENTITY_CONFIG,
} from "@/lib/queries/public";

// =============================================================================
// /explorar/[tipo]/[id] — ficha pública de una entidad.
// SSR (anon bajo RLS): solo accesible si la entidad tiene is_public = true.
// =============================================================================

interface Params {
  params: Promise<{ tipo: string; id: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tipo, id } = await params;
  if (!isPublicEntityType(tipo)) return { title: "ECOS" };
  const supabase = await createClient();
  const { data } = await getPublicEntity(supabase, tipo, id);
  if (!data) return { title: "No encontrado — ECOS" };
  const cfg = PUBLIC_ENTITY_CONFIG[tipo];
  const nombre = String(data.nombre ?? cfg.singular);
  const descripcion = data.descripcion ? String(data.descripcion) : undefined;
  return {
    title: `${nombre} — ECOS`,
    description: descripcion?.slice(0, 160),
  };
}

export default async function EntidadPage({ params }: Params) {
  const { tipo, id } = await params;
  if (!isPublicEntityType(tipo)) notFound();

  const cfg = PUBLIC_ENTITY_CONFIG[tipo];
  const supabase = await createClient();
  const { data } = await getPublicEntity(supabase, tipo, id);

  // Si no existe o no es pública, 404 (no se filtra que existe en privado).
  if (!data) notFound();

  const fields = getEntityDetailFields(tipo, data);
  const descripcion = data.descripcion ? String(data.descripcion) : null;

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/explorar/${tipo}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ChevronLeft className="h-4 w-4" />
        {cfg.label}
      </Link>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-brand-600">
        {cfg.singular}
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
        {String(data.nombre ?? "")}
      </h1>

      {descripcion && (
        <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-slate-700">
          {descripcion}
        </p>
      )}

      {fields.length > 0 && (
        <dl className="mt-8 grid gap-x-6 gap-y-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {f.label}
              </dt>
              <dd className="mt-0.5 text-sm text-slate-800">
                {/^https?:\/\//.test(f.value) ? (
                  <a
                    href={f.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:text-brand-700"
                  >
                    {f.value.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                ) : (
                  f.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}
