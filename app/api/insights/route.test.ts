import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  chunkFin,
  chunkTexto,
  chunkUso,
  crearSupabaseFalso,
  leerEventosSSE,
  streamDeChunks,
} from "@/test/utils";

const m = vi.hoisted(() => ({
  create: vi.fn(),
  supabase: null as ReturnType<typeof import("@/test/utils").crearSupabaseFalso> | null,
}));

vi.mock("openai", () => ({
  default: vi.fn(function OpenAI(this: unknown) {
    return { chat: { completions: { create: m.create } } };
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => m.supabase }));

import { POST } from "./route";

function peticion(body: unknown) {
  return new Request("http://localhost/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const INSIGHT_1 = {
  tipo: "vacio",
  titulo: "Reto sin innovaciones",
  descripcion: "El reto Movilidad no tiene innovaciones.",
  prioridad: "alta",
  evidencia: "0 innovaciones",
};
const INSIGHT_2 = {
  tipo: "fortaleza",
  titulo: "Buena evidencia",
  descripcion: "La mayoría de hallazgos están validados.",
  prioridad: "baja",
  evidencia: "80 %",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("OPENAI_API_KEY", "sk-prueba");
  m.supabase = crearSupabaseFalso({
    v_kpis_mision: { fila: { mision_id: "mision-1", total_retos: 3 } },
    retos: { fila: { id: "r1", nombre: "Movilidad", innovaciones_retos: [] } },
    insights_history: { fila: { id: "hist-1" } },
  });
});

describe("POST /api/insights", () => {
  it("responde 400 sin mision_id", async () => {
    const res = await POST(peticion({}));
    expect(res.status).toBe(400);
  });

  it("responde 500 si falta OPENAI_API_KEY", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const res = await POST(peticion({ mision_id: "mision-1" }));
    expect(res.status).toBe(500);
    expect(m.create).not.toHaveBeenCalled();
  });

  it("ejecuta las tools que pide el modelo y emite los insights NDJSON", async () => {
    // Ronda 1: el modelo pide get_reto_detail con los argumentos troceados.
    m.create.mockResolvedValueOnce(
      streamDeChunks([
        {
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: "call_1",
                    type: "function",
                    function: { name: "get_reto_detail", arguments: '{"reto' },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        },
        {
          choices: [
            {
              index: 0,
              delta: { tool_calls: [{ index: 0, function: { arguments: '_id":"r1"}' } }] },
              finish_reason: null,
            },
          ],
        },
        chunkFin("tool_calls"),
        chunkUso(100, 20),
      ]),
    );
    // Ronda 2: NDJSON con una línea partida entre chunks.
    const ndjson =
      `{"resumen":"Misión con huecos"}\n${JSON.stringify(INSIGHT_1)}\n${JSON.stringify(INSIGHT_2)}`;
    m.create.mockResolvedValueOnce(
      streamDeChunks([
        chunkTexto(ndjson.slice(0, 25)),
        chunkTexto(ndjson.slice(25, 90)),
        chunkTexto(ndjson.slice(90)),
        chunkFin("stop"),
        chunkUso(300, 150),
      ]),
    );

    const eventos = await leerEventosSSE(await POST(peticion({ mision_id: "mision-1" })));

    // Dos rondas con gpt-6-luna, tools en formato OpenAI y uso de tokens.
    expect(m.create).toHaveBeenCalledTimes(2);
    const ronda1 = m.create.mock.calls[0][0];
    expect(ronda1).toMatchObject({
      model: "gpt-6-luna",
      stream: true,
      stream_options: { include_usage: true },
      max_completion_tokens: 2000,
      reasoning_effort: "none",
    });
    expect(ronda1.tools.map((t: { function: { name: string } }) => t.function.name)).toEqual([
      "get_reto_detail",
      "get_innovacion_detail",
      "get_hallazgo_detail",
    ]);

    // La ronda 2 incluye la llamada del assistant y el resultado de la tool.
    const mensajes2 = m.create.mock.calls[1][0].messages;
    expect(mensajes2.at(-2)).toEqual({
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_1",
          type: "function",
          function: { name: "get_reto_detail", arguments: '{"reto_id":"r1"}' },
        },
      ],
    });
    expect(mensajes2.at(-1)).toMatchObject({ role: "tool", tool_call_id: "call_1" });
    expect(JSON.parse(mensajes2.at(-1).content)).toMatchObject({ id: "r1", nombre: "Movilidad" });

    // Eventos SSE.
    expect(eventos).toContainEqual({
      evento: "status",
      datos: { phase: "tool_call", tool: "get_reto_detail", input: { reto_id: "r1" } },
    });
    expect(eventos).toContainEqual({ evento: "resumen", datos: { text: "Misión con huecos" } });
    expect(eventos.filter((e) => e.evento === "insight").map((e) => e.datos)).toEqual([
      INSIGHT_1,
      INSIGHT_2,
    ]);
    expect(eventos.at(-1)).toEqual({
      evento: "done",
      datos: { saved_id: "hist-1", tokens: { input: 400, output: 170 } },
    });

    // Persistencia con el modelo nuevo y la suma de tokens de las dos rondas.
    const guardado = m.supabase!.inserciones.find((i) => i.tabla === "insights_history");
    expect(guardado?.valores).toEqual({
      mision_id: "mision-1",
      resumen: "Misión con huecos",
      insights: [INSIGHT_1, INSIGHT_2],
      model: "gpt-6-luna",
      tokens_input: 400,
      tokens_output: 170,
      generated_by: "usuario-1",
    });
  });

  it("no pierde el primer insight si viene en la línea del resumen", async () => {
    const combinada = JSON.stringify({ resumen: "Todo bien", ...INSIGHT_1 });
    m.create.mockResolvedValueOnce(
      streamDeChunks([
        chunkTexto(`${combinada}\n${JSON.stringify(INSIGHT_2)}`),
        chunkFin("stop"),
        chunkUso(50, 10),
      ]),
    );
    const eventos = await leerEventosSSE(await POST(peticion({ mision_id: "mision-1" })));
    expect(eventos).toContainEqual({ evento: "resumen", datos: { text: "Todo bien" } });
    expect(eventos.filter((e) => e.evento === "insight").map((e) => e.datos)).toEqual([
      INSIGHT_1,
      INSIGHT_2,
    ]);
  });

  it("termina en una ronda si el modelo no pide tools", async () => {
    m.create.mockResolvedValueOnce(
      streamDeChunks([
        chunkTexto(`{"resumen":"Todo bien"}\n${JSON.stringify(INSIGHT_2)}\n`),
        chunkFin("stop"),
        chunkUso(50, 10),
      ]),
    );
    const eventos = await leerEventosSSE(await POST(peticion({ mision_id: "mision-1" })));
    expect(m.create).toHaveBeenCalledTimes(1);
    expect(eventos.filter((e) => e.evento === "insight")).toHaveLength(1);
    expect(eventos.at(-1)?.evento).toBe("done");
  });

  it("emite error si la misión no existe", async () => {
    m.supabase = crearSupabaseFalso({});
    const eventos = await leerEventosSSE(await POST(peticion({ mision_id: "no-existe" })));
    expect(m.create).not.toHaveBeenCalled();
    expect(eventos.at(-1)).toEqual({
      evento: "error",
      datos: { message: "La misión no existe o no tiene actividad" },
    });
  });
});
