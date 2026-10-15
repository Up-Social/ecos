import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acumularToolCalls,
  aToolCallsDeMensaje,
  crearClienteOpenAI,
  formatearEventoSSE,
  parsearArgumentosTool,
  type ToolCallAcumulada,
} from "./openai";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("MODELO_CHAT", () => {
  it("usa gpt-6-luna por defecto", async () => {
    vi.stubEnv("OPENAI_CHAT_MODEL", undefined);
    vi.resetModules();
    const { MODELO_CHAT } = await import("./openai");
    expect(MODELO_CHAT).toBe("gpt-6-luna");
  });

  it("se puede cambiar con OPENAI_CHAT_MODEL", async () => {
    vi.stubEnv("OPENAI_CHAT_MODEL", "otro-modelo");
    vi.resetModules();
    const { MODELO_CHAT } = await import("./openai");
    expect(MODELO_CHAT).toBe("otro-modelo");
  });
});

describe("crearClienteOpenAI", () => {
  it("devuelve null si falta OPENAI_API_KEY", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(crearClienteOpenAI()).toBeNull();
  });

  it("crea el cliente con la clave", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-prueba");
    const cliente = crearClienteOpenAI();
    expect(cliente).not.toBeNull();
    expect(cliente?.apiKey).toBe("sk-prueba");
  });
});

describe("formatearEventoSSE", () => {
  it("serializa evento y datos en formato SSE", () => {
    expect(formatearEventoSSE("delta", { text: "hola" })).toBe(
      'event: delta\ndata: {"text":"hola"}\n\n',
    );
  });
});

describe("acumularToolCalls", () => {
  it("recompone llamadas troceadas e intercaladas por index", () => {
    const acc: ToolCallAcumulada[] = [];
    acumularToolCalls(acc, [
      { index: 0, id: "call_a", type: "function", function: { name: "get_reto_detail", arguments: "" } },
    ]);
    acumularToolCalls(acc, [
      { index: 1, id: "call_b", type: "function", function: { name: "get_hallazgo_detail" } },
      { index: 0, function: { arguments: '{"reto_' } },
    ]);
    acumularToolCalls(acc, [
      { index: 0, function: { arguments: 'id":"r1"}' } },
      { index: 1, function: { arguments: '{"hallazgo_id":"h9"}' } },
    ]);

    expect(acc).toEqual([
      { id: "call_a", nombre: "get_reto_detail", argumentos: '{"reto_id":"r1"}' },
      { id: "call_b", nombre: "get_hallazgo_detail", argumentos: '{"hallazgo_id":"h9"}' },
    ]);
  });

  it("ignora deltas vacíos o ausentes", () => {
    const acc: ToolCallAcumulada[] = [];
    acumularToolCalls(acc, undefined);
    acumularToolCalls(acc, null);
    acumularToolCalls(acc, []);
    expect(acc).toEqual([]);
  });
});

describe("aToolCallsDeMensaje", () => {
  it("convierte al formato del mensaje assistant y descarta llamadas incompletas", () => {
    const resultado = aToolCallsDeMensaje([
      { id: "call_a", nombre: "get_reto_detail", argumentos: "" },
      { id: "", nombre: "sin_id", argumentos: "{}" },
    ]);
    expect(resultado).toEqual([
      { id: "call_a", type: "function", function: { name: "get_reto_detail", arguments: "{}" } },
    ]);
  });
});

describe("parsearArgumentosTool", () => {
  it("parsea un objeto JSON válido", () => {
    expect(parsearArgumentosTool('{"reto_id":"r1"}')).toEqual({ reto_id: "r1" });
  });

  it.each(["", "{no es json", "[1,2]", "null", '"texto"'])(
    "devuelve {} sin lanzar con %j",
    (entrada) => {
      expect(parsearArgumentosTool(entrada)).toEqual({});
    },
  );
});
