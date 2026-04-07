import { createClient } from "@/lib/supabase/client";
import type { Mision } from "@/lib/supabase/types";
import type { MisionFormValues } from "@/lib/schemas/mision";

const supabase = createClient();

export async function getMisiones() {
  return supabase
    .from("misiones")
    .select("*")
    .order("created_at", { ascending: false });
}

/** Versión ligera para selects: id y nombre. */
export async function getMisionesLite() {
  return supabase.from("misiones").select("id, nombre").order("nombre");
}

function normalize(values: MisionFormValues) {
  return {
    nombre: values.nombre,
    descripcion: values.descripcion || null,
    problema: values.problema || null,
  };
}

export async function createMision(values: MisionFormValues) {
  return supabase.from("misiones").insert(normalize(values)).select().single();
}

export async function updateMision(id: string, values: MisionFormValues) {
  return supabase
    .from("misiones")
    .update(normalize(values))
    .eq("id", id)
    .select()
    .single();
}

export async function deleteMision(id: string) {
  return supabase.from("misiones").delete().eq("id", id);
}

export type { Mision };
