import { createClient } from "@/lib/supabase/client";
import type { HallazgoConRelaciones } from "@/lib/supabase/types";
import type { HallazgoFormValues } from "@/lib/schemas/hallazgo";

const supabase = createClient();

const SELECT_WITH_INNOVACION = `
  *,
  innovacion:innovaciones ( id, nombre )
`;

export async function getHallazgos() {
  return supabase
    .from("hallazgos")
    .select(SELECT_WITH_INNOVACION)
    .order("created_at", { ascending: false })
    .returns<HallazgoConRelaciones[]>();
}

/** Versión ligera para selects: id y titulo. */
export async function getHallazgosLite() {
  return supabase.from("hallazgos").select("id, titulo").order("titulo");
}

function normalize(values: HallazgoFormValues) {
  return {
    titulo: values.titulo,
    descripcion: values.descripcion,
    innovacion_id: values.innovacion_id,
    nivel_evidencia: values.nivel_evidencia || null,
    evidencia_cuantitativa: values.evidencia_cuantitativa || null,
    fuente: values.fuente || null,
    enlace: values.enlace ? values.enlace : null,
    validado: values.validado ?? false,
  };
}

export async function createHallazgo(values: HallazgoFormValues) {
  return supabase
    .from("hallazgos")
    .insert(normalize(values))
    .select()
    .single();
}

export async function updateHallazgo(id: string, values: HallazgoFormValues) {
  return supabase
    .from("hallazgos")
    .update(normalize(values))
    .eq("id", id)
    .select()
    .single();
}

export async function deleteHallazgo(id: string) {
  return supabase.from("hallazgos").delete().eq("id", id);
}
