import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserWithRoles } from "@/lib/auth/getCurrentUser";
import { canAccessPanel } from "@/lib/auth/roles";

export const runtime = "nodejs";

// =============================================================================
// /api/geolocalizar  (POST)
//
// Geolocaliza, con la Mapbox Geocoding API (v6), TODO lo geolocalizable que
// tenga una región asignada y aún no tenga coordenadas:
//   · territorios → por su nombre.
//   · agentes     → por su municipio (o, si falta, el territorio de su sede).
//   · proyectos   → por su CCAA.
// Cachea lat/lon en cada tabla. Reentrante: solo procesa lo pendiente.
//
// Acceso: PANEL_ROLES (re-comprobado aquí). Usa el cliente admin (service-role).
// =============================================================================

interface Resumen {
  total: number;
  geocodificados: number;
  sin_resultado: number;
}

// Sesgo de tipo Mapbox por nivel administrativo del territorio ECOS.
const TIPOS_MAPBOX: Record<string, string> = {
  estado: "country",
  ccaa: "region",
  provincia: "region,district",
  municipio: "place,locality",
};

async function geocodificar(
  region: string,
  token: string,
  tiposBias?: string,
): Promise<{ lat: number; lon: number } | null> {
  const q = region.trim();
  if (!q) return null;
  const params = new URLSearchParams({
    q: `${q}, España`,
    country: "es",
    language: "es",
    limit: "1",
    access_token: token,
  });
  if (tiposBias) params.set("types", tiposBias);

  const res = await fetch(
    `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: { geometry?: { coordinates?: [number, number] } }[];
  };
  const coords = data.features?.[0]?.geometry?.coordinates;
  if (!coords || coords.length !== 2) return null;
  return { lon: coords[0], lat: coords[1] };
}

type AdminClient = ReturnType<typeof createAdminClient>;

/** Procesa una lista de registros pendientes en lotes pequeños. */
async function procesar(
  admin: AdminClient,
  tabla: string,
  registros: { id: string; region: string | null; tipo?: string }[],
  token: string,
): Promise<Resumen> {
  const lista = registros.filter((r) => r.region && r.region.trim());
  let geocodificados = 0;
  let sinResultado = 0;
  const LOTE = 8;

  for (let i = 0; i < lista.length; i += LOTE) {
    const lote = lista.slice(i, i + LOTE);
    await Promise.all(
      lote.map(async (r) => {
        let coords: { lat: number; lon: number } | null = null;
        try {
          coords = await geocodificar(
            r.region as string,
            token,
            r.tipo ? TIPOS_MAPBOX[r.tipo] : undefined,
          );
        } catch {
          coords = null;
        }
        if (!coords) {
          sinResultado += 1;
          return;
        }
        const { error } = await admin
          .from(tabla)
          .update({
            latitud: coords.lat,
            longitud: coords.lon,
            geocoded_at: new Date().toISOString(),
          })
          .eq("id", r.id);
        if (error) sinResultado += 1;
        else geocodificados += 1;
      }),
    );
  }

  return { total: lista.length, geocodificados, sin_resultado: sinResultado };
}

export async function POST() {
  const current = await getCurrentUserWithRoles();
  if (!current) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!canAccessPanel(current.roles)) {
    return NextResponse.json(
      { error: "Permisos insuficientes" },
      { status: 403 },
    );
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Falta NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN en el entorno" },
      { status: 500 },
    );
  }

  const admin = createAdminClient();

  // 1. Territorios pendientes (por nombre).
  const { data: terr } = await admin
    .from("territorios")
    .select("id, nombre, tipo")
    .is("latitud", null)
    .returns<{ id: string; nombre: string; tipo: string }[]>();

  // 2. Agentes pendientes con región (municipio o territorio de sede).
  const { data: ag } = await admin
    .from("agentes")
    .select(
      "id, municipio_sede, latitud, sede:territorios!agentes_sede_territorio_id_fkey(nombre)",
    )
    .is("latitud", null)
    .returns<
      {
        id: string;
        municipio_sede: string | null;
        sede: { nombre: string } | null;
      }[]
    >();

  // 3. Proyectos pendientes con CCAA.
  const { data: pr } = await admin
    .from("proyectos")
    .select("id, ccaa, latitud")
    .is("latitud", null)
    .not("ccaa", "is", null)
    .returns<{ id: string; ccaa: string | null }[]>();

  const [resTerr, resAg, resPr] = await Promise.all([
    procesar(
      admin,
      "territorios",
      (terr ?? []).map((t) => ({ id: t.id, region: t.nombre, tipo: t.tipo })),
      token,
    ),
    procesar(
      admin,
      "agentes",
      (ag ?? []).map((a) => ({
        id: a.id,
        region: a.municipio_sede ?? a.sede?.nombre ?? null,
      })),
      token,
    ),
    procesar(
      admin,
      "proyectos",
      (pr ?? []).map((p) => ({ id: p.id, region: p.ccaa })),
      token,
    ),
  ]);

  const total =
    resTerr.geocodificados + resAg.geocodificados + resPr.geocodificados;

  return NextResponse.json({
    geocodificados: total,
    territorios: resTerr,
    agentes: resAg,
    proyectos: resPr,
  });
}
