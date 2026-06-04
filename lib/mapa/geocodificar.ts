// =============================================================================
// Geocodificación de una región con la Mapbox Geocoding API (v6), desde el
// cliente (token público pk.*). Se usa en los CRUD para rellenar lat/lon a partir
// de la región (municipio de un agente, CCAA de un proyecto…).
// =============================================================================

export interface Coordenadas {
  lat: number;
  lon: number;
}

export async function geocodificarRegion(
  region: string,
): Promise<Coordenadas | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const q = region.trim();
  if (!token || !q) return null;

  const params = new URLSearchParams({
    q: `${q}, España`,
    country: "es",
    language: "es",
    limit: "1",
    access_token: token,
  });

  const res = await fetch(
    `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`,
  );
  if (!res.ok) return null;

  const data = (await res.json()) as {
    features?: { geometry?: { coordinates?: [number, number] } }[];
  };
  const coords = data.features?.[0]?.geometry?.coordinates;
  if (!coords || coords.length !== 2) return null;
  return { lon: coords[0], lat: coords[1] }; // Mapbox: [lon, lat]
}
