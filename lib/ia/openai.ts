// -----------------------------------------------------------------------------
// Cliente de IA generativa (OpenAI) compartido por /api/chat y /api/insights.
//
// SOLO SERVER: lee process.env (OPENAI_API_KEY). No importar desde el cliente.
// Los embeddings siguen en lib/embeddings (mismo proveedor y misma clave).
// -----------------------------------------------------------------------------

import OpenAI from "openai";
import type {
  ChatCompletionChunk,
  ChatCompletionMessageFunctionToolCall,
} from "openai/resources/chat/completions";

/** Modelo de chat de ECOS. Overridable por OPENAI_CHAT_MODEL sin tocar código. */
export const MODELO_CHAT = process.env.OPENAI_CHAT_MODEL ?? "gpt-6-luna";

/** Devuelve el cliente de OpenAI, o null si falta OPENAI_API_KEY. */
export function crearClienteOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

/** Serializa un evento Server-Sent Events. */
export function formatearEventoSSE(evento: string, datos: unknown): string {
  return `event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`;
}

// -----------------------------------------------------------------------------
// Tool calls en streaming
//
// OpenAI envía cada tool call troceado en varios chunks: el primero trae `id` y
// `name`, los siguientes solo fragmentos de `arguments`. Todos llevan `index`,
// que es lo que permite recomponerlos aunque lleguen intercalados.
// -----------------------------------------------------------------------------

type DeltaToolCall = ChatCompletionChunk.Choice.Delta.ToolCall;

export interface ToolCallAcumulada {
  id: string;
  nombre: string;
  argumentos: string;
}

/** Une los fragmentos de un chunk sobre lo acumulado (muta y devuelve `acumulado`). */
export function acumularToolCalls(
  acumulado: ToolCallAcumulada[],
  deltas: DeltaToolCall[] | null | undefined,
): ToolCallAcumulada[] {
  for (const d of deltas ?? []) {
    const actual = (acumulado[d.index] ??= { id: "", nombre: "", argumentos: "" });
    if (d.id) actual.id = d.id;
    if (d.function?.name) actual.nombre += d.function.name;
    if (d.function?.arguments) actual.argumentos += d.function.arguments;
  }
  return acumulado;
}

/** Convierte lo acumulado al formato que espera el mensaje `assistant` siguiente. */
export function aToolCallsDeMensaje(
  acumulado: ToolCallAcumulada[],
): ChatCompletionMessageFunctionToolCall[] {
  return acumulado
    .filter((tc) => tc && tc.id && tc.nombre)
    .map((tc) => ({
      id: tc.id,
      type: "function",
      function: { name: tc.nombre, arguments: tc.argumentos || "{}" },
    }));
}

/** El modelo puede devolver JSON inválido en los argumentos: nunca lanzar. */
export function parsearArgumentosTool(json: string): Record<string, unknown> {
  try {
    const valor: unknown = JSON.parse(json || "{}");
    return valor && typeof valor === "object" && !Array.isArray(valor)
      ? (valor as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
