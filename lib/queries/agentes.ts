import { createClient } from "@/lib/supabase/client";
import type { Agente } from "@/lib/supabase/types";
import type { AgenteFormValues } from "@/lib/schemas/agente";

// -----------------------------------------------------------------------------
// CRUD de agentes (cliente, desde el browser).
// Las funciones devuelven { data, error } siguiendo la convención de Supabase.
// -----------------------------------------------------------------------------

const supabase = createClient();

export async function getAgentes() {
  return supabase
    .from("agentes")
    .select("*")
    .order("created_at", { ascending: false });
}

/** Versión ligera para selects: solo id, nombre y email. */
export async function getAgentesLite() {
  return supabase
    .from("agentes")
    .select("id, nombre, email")
    .order("nombre");
}

export async function getAgente(id: string) {
  return supabase.from("agentes").select("*").eq("id", id).single();
}

/** Limpia strings vacíos a null antes de insertar. */
function normalize(values: AgenteFormValues) {
  return {
    nombre: values.nombre,
    tipo_agente: values.tipo_agente || null,
    email: values.email ? values.email : null,
    web: values.web ? values.web : null,
  };
}

export async function createAgente(values: AgenteFormValues) {
  return supabase
    .from("agentes")
    .insert(normalize(values))
    .select()
    .single();
}

export async function updateAgente(id: string, values: AgenteFormValues) {
  return supabase
    .from("agentes")
    .update(normalize(values))
    .eq("id", id)
    .select()
    .single();
}

export async function deleteAgente(id: string) {
  return supabase.from("agentes").delete().eq("id", id);
}

export type { Agente };
