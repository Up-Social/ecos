"use client";

import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { geocodificarRegion } from "@/lib/mapa/geocodificar";

// =============================================================================
// CamposGeolocalizacion — bloque reutilizable para los CRUD (agentes, proyectos).
// Muestra latitud/longitud editables y un botón que las calcula desde la región
// (municipio / CCAA) usando la Mapbox Geocoding API (token público, en cliente).
// =============================================================================

interface Props {
  latitud: number | null;
  longitud: number | null;
  /** Texto de región a geocodificar (municipio de un agente, CCAA de un proyecto…). */
  region: string;
  onCoords: (lat: number | null, lon: number | null) => void;
}

export function CamposGeolocalizacion({
  latitud,
  longitud,
  region,
  onCoords,
}: Props) {
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function calcular() {
    if (!region.trim()) {
      setMsg("Indica antes una región (municipio / CCAA).");
      return;
    }
    setCargando(true);
    setMsg(null);
    const coords = await geocodificarRegion(region);
    setCargando(false);
    if (!coords) {
      setMsg("No se encontraron coordenadas para esa región.");
      return;
    }
    onCoords(coords.lat, coords.lon);
    setMsg(`Coordenadas actualizadas desde "${region.trim()}".`);
  }

  const num = (v: string) => (v === "" ? null : Number(v));

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">
          Ubicación en el mapa
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={calcular}
          disabled={cargando}
        >
          {cargando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MapPin className="h-3.5 w-3.5" />
          )}
          Calcular desde la región
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitud">
          <Input
            type="number"
            step="any"
            value={latitud ?? ""}
            onChange={(e) => onCoords(num(e.target.value), longitud)}
            placeholder="41.3874"
          />
        </Field>
        <Field label="Longitud">
          <Input
            type="number"
            step="any"
            value={longitud ?? ""}
            onChange={(e) => onCoords(latitud, num(e.target.value))}
            placeholder="2.1686"
          />
        </Field>
      </div>
      {msg && <p className="mt-1.5 text-xs text-slate-500">{msg}</p>}
    </div>
  );
}
