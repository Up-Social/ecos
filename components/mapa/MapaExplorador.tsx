"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { MapaPunto, MapaTipo } from "@/lib/queries/mapa";
import {
  MAPA_TIPOS,
  agregarPorUbicacion,
  calcularFacetas,
  filtrarPuntos,
  filtrosVacios,
  hayFiltrosActivos,
  type MapaEtiquetas,
  type MapaFiltros,
  type DimensionRelacional,
} from "@/lib/mapa/filtrar";
import { MapaFiltros as MapaFiltrosUI } from "./MapaFiltros";
import { MapaLeyenda } from "./MapaLeyenda";

// El lienzo Mapbox necesita el DOM/WebGL → se carga solo en cliente (sin SSR).
const MapaCanvas = dynamic(
  () => import("./MapaCanvas").then((m) => m.MapaCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[460px] w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-400">
        Cargando mapa…
      </div>
    ),
  },
);

// =============================================================================
// MapaExplorador — orquestador del mapa público de /explorar.
// Mantiene el estado de filtros y calcula EN MEMORIA los puntos visibles, las
// facetas (cascada restrictiva) y la agregación por territorio. Instantáneo.
// =============================================================================

interface Props {
  puntos: MapaPunto[];
  etiquetas: MapaEtiquetas;
}

export function MapaExplorador({ puntos, etiquetas }: Props) {
  const [filtros, setFiltros] = useState<MapaFiltros>(filtrosVacios);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Puntos que pasan los filtros relacionales (independiente de la visibilidad
  // por tipo): sirve para la leyenda (conteos) y, filtrado por tipo, para el mapa.
  const puntosRelacionales = useMemo(
    () => filtrarPuntos(puntos, { ...filtros, tipos: MAPA_TIPOS }),
    [puntos, filtros],
  );

  const conteos = useMemo<Record<MapaTipo, number>>(
    () => ({
      agentes: puntosRelacionales.filter((p) => p.tipo === "agentes").length,
      proyectos: puntosRelacionales.filter((p) => p.tipo === "proyectos").length,
    }),
    [puntosRelacionales],
  );

  const marcadores = useMemo(() => {
    const visibles = puntosRelacionales.filter((p) =>
      filtros.tipos.includes(p.tipo),
    );
    return agregarPorUbicacion(visibles);
  }, [puntosRelacionales, filtros.tipos]);

  const facetas = useMemo(
    () => calcularFacetas(puntos, filtros, etiquetas),
    [puntos, filtros, etiquetas],
  );

  function cambiar(dim: DimensionRelacional, value: string | null) {
    setFiltros((f) => ({ ...f, [dim]: value }));
  }

  function toggleTipo(tipo: MapaTipo) {
    setFiltros((f) => ({
      ...f,
      tipos: f.tipos.includes(tipo)
        ? f.tipos.filter((t) => t !== tipo)
        : [...f.tipos, tipo],
    }));
  }

  // Sin token configurado → no se puede renderizar Mapbox.
  if (!token) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        El mapa no está disponible: falta configurar
        <code className="mx-1 rounded bg-amber-100 px-1">
          NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
        </code>
        en el entorno.
      </div>
    );
  }

  // Sin puntos geolocalizados (territorios sin geocodificar).
  if (puntos.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
        <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-400" />
        <p>
          Todavía no hay entidades geolocalizadas en el mapa. Un gestor puede
          generarlas desde <strong>Importar → Geocodificar territorios</strong>.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Mapa del ecosistema
        </h2>
        <MapaLeyenda tipos={filtros.tipos} conteos={conteos} onToggle={toggleTipo} />
      </div>

      <MapaFiltrosUI
        facetas={facetas}
        filtros={filtros}
        onCambiar={cambiar}
        onReset={() => setFiltros(filtrosVacios())}
        hayFiltros={hayFiltrosActivos(filtros)}
      />

      <MapaCanvas token={token} marcadores={marcadores} />
    </section>
  );
}
