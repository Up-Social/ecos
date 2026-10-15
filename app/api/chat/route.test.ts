import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  chunkFin,
  chunkTexto,
  crearSupabaseFalso,
  leerEventosSSE,
  streamDeChunks,
} from "@/test/utils";

const m = vi.hoisted(() => ({
  create: vi.fn(),
  getCurrentUserWithRoles: vi.fn(),
  supabase: null as ReturnType<typeof import("@/test/utils").crearSupabaseFalso> | null,
  buildContext: vi.fn(),
}));

vi.mock("openai", () => ({
  default: vi.fn(function OpenAI(this: unknown) {
    return { chat: { completions: { create: m.create } } };
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => m.supabase }));
vi.mock("@/lib/auth/getCurrentUser", () => ({
  getCurrentUserWithRoles: m.getCurrentUserWithRoles,
}));
vi.mock("@/lib/graphrag/pipeline", () => ({
  retrieveVector: vi.fn(async () => [
    { entity_type: "proyecto", entity_id: "p1", score: 0.9, chunk: "texto" },
  ]),
  expandGraph: vi.fn(async () => []),
  rerank: vi.fn(() => [{ entity_type: "proyecto", entity_id: "p1", score: 0.9, origin: "vector" }]),
  buildContext: m.buildContext,
}));

import { POST } from "./route";

function peticion(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const CONTEXTO_CON_FUENTE = {
  items: [
    {
      entity_type: "proyecto",
      entity_id: "p1",
      title: "Proyecto Uno",
      score: 0.9,
      origin: "vector",
      cite: 1,
    },
  ],
  contextText: "[1] Proyecto Uno: descripción",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("OPENAI_API_KEY", "sk-prueba");
  m.supabase = crearSupabaseFalso({
    conversations: { fila: { id: "conv-1" } },
    messages: { fila: { id: "msg-asistente" } },
  });
  m.getCurrentUserWithRoles.mockResolvedValue({ roles: ["usuario"] });
  m.buildContext.mockResolvedValue(CONTEXTO_CON_FUENTE);
});

describe("POST /api/chat", () => {
  it("responde 500 si falta OPENAI_API_KEY", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const res = await POST(peticion({ message: "Hola" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "OPENAI_API_KEY no configurada" });
    expect(m.create).not.toHaveBeenCalled();
  });

  it("responde 400 si el mensaje está vacío", async () => {
    const res = await POST(peticion({ message: "   " }));
    expect(res.status).toBe(400);
  });

  it("responde 401 sin sesión", async () => {
    m.getCurrentUserWithRoles.mockResolvedValue(null);
    const res = await POST(peticion({ message: "Hola" }));
    expect(res.status).toBe(401);
  });

  it("emite la respuesta de gpt-6-luna en streaming y la guarda", async () => {
    m.create.mockResolvedValue(
      streamDeChunks([chunkTexto("Hay un "), chunkTexto("proyecto [1]."), chunkFin("stop")]),
    );

    const res = await POST(peticion({ message: "¿Qué proyectos hay?" }));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const eventos = await leerEventosSSE(res);

    // Llamada a OpenAI: modelo, límite de tokens y prompts.
    expect(m.create).toHaveBeenCalledTimes(1);
    const params = m.create.mock.calls[0][0];
    expect(params).toMatchObject({
      model: "gpt-6-luna",
      stream: true,
      max_completion_tokens: 1500,
    });
    expect(params).not.toHaveProperty("max_tokens");
    expect(params.messages[0].role).toBe("system");
    expect(params.messages[1]).toMatchObject({ role: "user" });
    expect(params.messages[1].content).toContain("[1] Proyecto Uno");
    expect(params.messages[1].content).toContain("¿Qué proyectos hay?");

    // Eventos SSE: mismo contrato que antes de la migración.
    const deltas = eventos.filter((e) => e.evento === "delta").map((e) => e.datos);
    expect(deltas).toEqual([{ text: "Hay un " }, { text: "proyecto [1]." }]);
    expect(eventos.find((e) => e.evento === "sources")?.datos).toEqual(CONTEXTO_CON_FUENTE.items);
    expect(eventos.at(-1)).toEqual({
      evento: "done",
      datos: { conversation_id: "conv-1", message_id: "msg-asistente" },
    });

    // Persistencia: mensaje del usuario, respuesta completa y fuentes.
    const mensajes = m.supabase!.inserciones.filter((i) => i.tabla === "messages");
    expect(mensajes.map((i) => i.valores)).toEqual([
      { conversation_id: "conv-1", role: "user", content: "¿Qué proyectos hay?" },
      { conversation_id: "conv-1", role: "assistant", content: "Hay un proyecto [1]." },
    ]);
    expect(m.supabase!.inserciones.some((i) => i.tabla === "conversation_sources")).toBe(true);
  });

  it("sin contexto responde sin llamar a OpenAI", async () => {
    m.buildContext.mockResolvedValue({ items: [], contextText: "" });
    const eventos = await leerEventosSSE(await POST(peticion({ message: "Hola" })));
    expect(m.create).not.toHaveBeenCalled();
    expect(eventos.some((e) => e.evento === "delta")).toBe(true);
    expect(eventos.at(-1)?.evento).toBe("done");
  });

  it("emite un evento error si OpenAI falla", async () => {
    m.create.mockRejectedValue(new Error("429 Rate limit"));
    const eventos = await leerEventosSSE(await POST(peticion({ message: "Hola" })));
    expect(eventos.at(-1)).toEqual({ evento: "error", datos: { message: "429 Rate limit" } });
  });
});
