"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import {
  MAPA_TIPO_COLORS,
  MAPA_TIPO_SINGULAR,
  MAPA_TIPO_LABELS,
  type MapaMarcador,
} from "@/lib/mapa/filtrar";

// =============================================================================
// MapaCanvas — lienzo Mapbox GL del portal /explorar.
//
// Pinta un marcador por (territorio, tipo) con color por tipo, el conteo dentro
// y un popup al hacer clic (territorio + entidades con enlace a su ficha).
// Se monta solo en cliente (Mapbox necesita el DOM/WebGL).
// =============================================================================

interface Props {
  token: string;
  marcadores: MapaMarcador[];
}

// Offset en píxeles por tipo para que, si coinciden en el mismo territorio, no
// se solapen (constante en todos los zooms).
const OFFSET_TIPO: Record<string, [number, number]> = {
  agentes: [-11, 0],
  proyectos: [11, 0],
};

// Encuadre de España (península + Baleares) [SO, NE]. De momento todas las
// entidades son de España, así que el mapa se centra siempre aquí.
const SPAIN_BOUNDS: [[number, number], [number, number]] = [
  [-9.5, 35.9],
  [4.4, 43.9],
];

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );
}

function popupHTML(m: MapaMarcador): string {
  const color = MAPA_TIPO_COLORS[m.tipo];
  const visibles = m.puntos.slice(0, 8);
  const resto = m.puntos.length - visibles.length;
  const items = visibles
    .map(
      (p) =>
        `<li class="truncate"><a class="text-brand-600 hover:underline" href="/explorar/${m.tipo}/${p.entidad_id}">${esc(
          p.nombre,
        )}</a></li>`,
    )
    .join("");
  const masItem =
    resto > 0
      ? `<li class="text-slate-400">+${resto} más</li>`
      : "";
  return `
    <div class="min-w-[180px] max-w-[240px] space-y-1.5 p-1">
      <p class="text-sm font-semibold text-slate-900">${esc(m.ubicacionNombre)}</p>
      <p class="flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <span class="inline-block h-2.5 w-2.5 rounded-full" style="background:${color}"></span>
        ${m.total} ${esc(m.total === 1 ? MAPA_TIPO_SINGULAR[m.tipo] : MAPA_TIPO_LABELS[m.tipo].toLowerCase())}
      </p>
      <ul class="space-y-0.5 text-xs text-slate-700">${items}${masItem}</ul>
    </div>`;
}

function crearElementoMarcador(m: MapaMarcador): HTMLButtonElement {
  const color = MAPA_TIPO_COLORS[m.tipo];
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute(
    "aria-label",
    `${m.total} ${MAPA_TIPO_LABELS[m.tipo].toLowerCase()} en ${m.ubicacionNombre}`,
  );
  // Tamaño según el conteo (acotado), para insinuar volumen.
  const size = Math.min(40, 20 + Math.round(Math.log2(m.total + 1) * 6));
  el.style.cssText = `
    display:flex;align-items:center;justify-content:center;
    width:${size}px;height:${size}px;border-radius:9999px;
    background:${color};color:#fff;border:2px solid #fff;
    box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer;
    font-size:11px;font-weight:700;line-height:1;padding:0;`;
  el.textContent = String(m.total);
  return el;
}

export function MapaCanvas({ token, marcadores }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Inicialización del mapa (una sola vez). Encuadrado en España.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      bounds: SPAIN_BOUNDS,
      fitBoundsOptions: { padding: 24 },
      attributionControl: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    // Responsive: re-dimensionar el mapa cuando cambie el tamaño del contenedor
    // (cambios de layout, no solo de ventana).
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  // Re-pintar marcadores cuando cambian los filtros.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((mk) => mk.remove());
    markersRef.current = [];
    popupRef.current?.remove();

    for (const m of marcadores) {
      const el = crearElementoMarcador(m);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({ offset: 16, maxWidth: "260px" })
          .setLngLat([m.longitud, m.latitud])
          .setHTML(popupHTML(m))
          .addTo(map);
      });
      const marker = new mapboxgl.Marker({
        element: el,
        offset: OFFSET_TIPO[m.tipo] ?? [0, 0],
      })
        .setLngLat([m.longitud, m.latitud])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [marcadores]);

  return (
    <div
      ref={containerRef}
      className="h-[55vh] min-h-[360px] max-h-[640px] w-full overflow-hidden rounded-lg border border-slate-200"
    />
  );
}
