import { createClient } from "@/lib/supabase/client";
import type { ProyectoConLider } from "@/lib/supabase/types";
import type { ProyectoFormValues } from "@/lib/schemas/proyecto";

// -----------------------------------------------------------------------------
// CRUD de proyectos.
// El listado incluye el agente líder embebido vía join de Supabase.
// -----------------------------------------------------------------------------

const supabase = createClient();

export async function getProyectos(opts: { misionId?: string | null } = {}) {
  // Si hay filtro por misión, primero obtenemos los proyecto_id desde la vista
  // derivada `proyectos_misiones` y filtramos el listado.
  let allowedIds: string[] | null = null;
  if (opts.misionId) {
    const { data } = await supabase
      .from("proyectos_misiones")
      .select("proyecto_id")
      .eq("mision_id", opts.misionId);
    allowedIds = (data ?? []).map((r: any) => r.proyecto_id as string);
    if (allowedIds.length === 0) {
      return { data: [] as ProyectoConLider[], error: null };
    }
  }

  const query = supabase
    .from("proyectos")
    .select(
      `
      *,
      agente_lider:agentes!proyectos_agente_lider_id_fkey ( id, nombre, email )
    `,
    )
    .order("created_at", { ascending: false });

  if (allowedIds) query.in("id", allowedIds);

  return query.returns<ProyectoConLider[]>();
}

/** Versión ligera para selects: solo id y nombre. */
export async function getProyectosLite() {
  return supabase.from("proyectos").select("id, nombre").order("nombre");
}

export async function getProyecto(id: string) {
  return supabase
    .from("proyectos")
    .select(
      `
      *,
      agente_lider:agentes!proyectos_agente_lider_id_fkey ( id, nombre, email )
    `,
    )
    .eq("id", id)
    .single<ProyectoConLider>();
}

function normalize(values: ProyectoFormValues) {
  return {
    nombre: values.nombre,
    descripcion: values.descripcion || null,
    agente_lider_id: values.agente_lider_id,
    estado: values.estado || null,
    financiador: values.financiador || null,
  };
}

export async function createProyecto(values: ProyectoFormValues) {
  return supabase
    .from("proyectos")
    .insert(normalize(values))
    .select()
    .single();
}

export async function updateProyecto(id: string, values: ProyectoFormValues) {
  return supabase
    .from("proyectos")
    .update(normalize(values))
    .eq("id", id)
    .select()
    .single();
}

export async function deleteProyecto(id: string) {
  return supabase.from("proyectos").delete().eq("id", id);
}
