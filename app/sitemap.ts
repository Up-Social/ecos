import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { PUBLIC_ENTITY_TYPES } from "@/lib/queries/public";

// =============================================================================
// Sitemap del portal público. Incluye las rutas estáticas y una entrada por
// cada entidad pública (is_public = true), leída con un cliente anon (RLS).
// =============================================================================

export const dynamic = "force-dynamic";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/explorar`, changeFrequency: "weekly", priority: 0.8 },
    ...PUBLIC_ENTITY_TYPES.map((t) => ({
      url: `${base}/explorar/${t}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];

  // Entidades públicas (best-effort: si la BD no está disponible, solo estáticas).
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return staticRoutes;

    const supabase = createClient(url, key, {
      auth: { persistSession: false },
    });

    const dynamicRoutes: MetadataRoute.Sitemap = [];
    for (const type of PUBLIC_ENTITY_TYPES) {
      const { data } = await supabase
        .from(type)
        .select("id")
        .eq("is_public", true);
      for (const row of data ?? []) {
        dynamicRoutes.push({
          url: `${base}/explorar/${type}/${(row as { id: string }).id}`,
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }
    }
    return [...staticRoutes, ...dynamicRoutes];
  } catch {
    return staticRoutes;
  }
}
