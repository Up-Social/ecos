import { describe, expect, it } from "vitest";
import {
  agenteSchema,
  chatSchema,
  hallazgoSchema,
  relationshipSchema,
  searchSchema,
} from "./index";
import { usuarioCreateSchema } from "./usuario";

const UUID_A = "3f0e8c2a-5b1d-4c7e-9a6f-2d8b4e1c7a90";
const UUID_B = "8a2d4f6c-1e3b-4d5a-b7c9-0e2f4a6b8c1d";

function mensajes(resultado: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  return Object.fromEntries(
    (resultado.error?.issues ?? []).map((i) => [i.path.join("."), i.message]),
  );
}

describe("mensajes de validación", () => {
  it("conserva los mensajes propios de cada campo", () => {
    const r = agenteSchema.safeParse({ nombre: "A", email: "no-es-email", web: "no-es-url" });
    expect(mensajes(r)).toEqual({
      nombre: "El nombre es obligatorio",
      email: "Email no válido",
      web: "URL no válida",
    });
  });

  it("los mensajes por defecto de Zod salen en español", () => {
    const r = chatSchema.safeParse({});
    expect(r.success).toBe(false);
    expect(mensajes(r).message).toMatch(/se esperaba texto/);
  });

  it("los identificadores no válidos tienen mensaje propio", () => {
    const r = chatSchema.safeParse({ message: "hola", conversationId: "x" });
    expect(mensajes(r)).toEqual({ conversationId: "Conversación no válida" });
  });

  it("el mensaje de uuid llega al campo", () => {
    const r = usuarioCreateSchema.safeParse({
      email: "a@b.org",
      password: "12345678",
      nombre: "Ana",
      apellidos: "Ruiz",
      roles: [],
    });
    expect(mensajes(r)).toEqual({ roles: "Debes asignar al menos un rol" });

    const h = hallazgoSchema.safeParse({ titulo: "Ti", descripcion: "De", innovacion_id: "x" });
    expect(mensajes(h)).toEqual({ innovacion_id: "Selecciona una innovación" });
  });
});

describe("campos opcionales y valores por defecto", () => {
  it("acepta email y web vacíos y aplica los defaults", () => {
    const r = agenteSchema.parse({ nombre: "Agente", email: "", web: "" });
    expect(r).toMatchObject({ email: "", web: "", rol_ecosistema: [], grupos_poblacion: [], is_public: false });
  });

  it("coerciona y acota el límite de la búsqueda", () => {
    expect(searchSchema.parse({ q: "  agua  ", limit: "5" })).toEqual({ q: "agua", limit: 5 });
    expect(searchSchema.parse({ q: "agua" }).limit).toBe(10);
    expect(searchSchema.safeParse({ q: "agua", limit: "99" }).success).toBe(false);
  });
});

describe("relationshipSchema", () => {
  const base = {
    source_entity_type: "agentes",
    source_entity_id: UUID_A,
    relationship_type_id: UUID_B,
    target_entity_type: "agentes",
  } as const;

  it("rechaza que una entidad se relacione consigo misma, en el campo destino", () => {
    const r = relationshipSchema.safeParse({ ...base, target_entity_id: UUID_A });
    expect(mensajes(r)).toEqual({
      target_entity_id: "Una entidad no puede relacionarse consigo misma",
    });
  });

  it("acepta una relación entre entidades distintas", () => {
    expect(relationshipSchema.safeParse({ ...base, target_entity_id: UUID_B }).success).toBe(true);
  });
});
