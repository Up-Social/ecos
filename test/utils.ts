// Utilidades compartidas por las pruebas unitarias (sin red ni BD reales).

import type { ChatCompletionChunk } from "openai/resources/chat/completions";

export interface EventoSSE {
  evento: string;
  datos: unknown;
}

/** Lee entero el cuerpo SSE de una Response y lo devuelve como lista de eventos. */
export async function leerEventosSSE(res: Response): Promise<EventoSSE[]> {
  const texto = await res.text();
  return texto
    .split("\n\n")
    .filter((bloque) => bloque.trim())
    .map((bloque) => {
      const evento = /^event: (.*)$/m.exec(bloque)?.[1] ?? "";
      const datos = /^data: (.*)$/m.exec(bloque)?.[1] ?? "null";
      return { evento, datos: JSON.parse(datos) };
    });
}

/** Simula el stream de chat.completions.create({ stream: true }). */
export async function* streamDeChunks(
  chunks: Array<Partial<ChatCompletionChunk>>,
): AsyncGenerator<ChatCompletionChunk> {
  for (const c of chunks) {
    yield { choices: [], ...c } as ChatCompletionChunk;
  }
}

/** Chunk con un delta de texto. */
export function chunkTexto(texto: string): Partial<ChatCompletionChunk> {
  return { choices: [{ index: 0, delta: { content: texto }, finish_reason: null }] };
}

/** Chunk que cierra la respuesta con un finish_reason. */
export function chunkFin(
  motivo: ChatCompletionChunk.Choice["finish_reason"],
): Partial<ChatCompletionChunk> {
  return { choices: [{ index: 0, delta: {}, finish_reason: motivo }] };
}

/** Último chunk con include_usage: trae el uso y no tiene choices. */
export function chunkUso(prompt: number, completion: number): Partial<ChatCompletionChunk> {
  return {
    choices: [],
    usage: { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion },
  };
}

// -----------------------------------------------------------------------------
// Supabase falso
//
// `from(tabla)` devuelve un builder encadenable: cualquier método de filtro
// devuelve el mismo builder; `single`/`maybeSingle` resuelven a `fila` y hacer
// `await` del builder resuelve a `lista`. Las inserciones se registran.
// -----------------------------------------------------------------------------

export interface RespuestaTabla {
  fila?: unknown;
  lista?: unknown[];
  error?: { message: string } | null;
}

export function crearSupabaseFalso(respuestas: Record<string, RespuestaTabla> = {}) {
  const inserciones: Array<{ tabla: string; valores: unknown }> = [];

  const from = (tabla: string) => {
    const r = respuestas[tabla] ?? {};
    const error = r.error ?? null;
    const builder: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "order", "limit", "update"]) {
      builder[m] = () => builder;
    }
    builder.insert = (valores: unknown) => {
      inserciones.push({ tabla, valores });
      return builder;
    };
    builder.single = async () => ({ data: r.fila ?? null, error });
    builder.maybeSingle = async () => ({ data: r.fila ?? null, error });
    builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve({ data: r.lista ?? [], error }).then(resolve, reject);
    return builder;
  };

  return {
    from,
    auth: { getUser: async () => ({ data: { user: { id: "usuario-1" } }, error: null }) },
    inserciones,
  };
}
