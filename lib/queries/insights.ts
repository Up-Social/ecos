// -----------------------------------------------------------------------------
// Cliente de /api/insights:
//
//   getLatestInsight(misionId)             → carga la última fila del histórico
//   streamInsights(misionId, callbacks)    → POST streaming SSE con callbacks
// -----------------------------------------------------------------------------

export interface Insight {
  tipo:
    | "vacio"
    | "oportunidad"
    | "concentracion"
    | "madurez"
    | "cuello_botella"
    | "fortaleza";
  titulo: string;
  descripcion: string;
  prioridad: "alta" | "media" | "baja";
  evidencia: string;
}

export interface LatestInsight {
  id: string;
  resumen: string | null;
  insights: Insight[];
  model: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  created_at: string;
}

// =============================================================================
// GET — última lectura del histórico
// =============================================================================

export async function getLatestInsight(
  misionId: string,
): Promise<LatestInsight | null> {
  const res = await fetch(
    `/api/insights?mision_id=${encodeURIComponent(misionId)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return {
    id: data.id,
    resumen: data.resumen ?? null,
    insights: (data.insights ?? []) as Insight[],
    model: data.model ?? null,
    tokens_input: data.tokens_input ?? null,
    tokens_output: data.tokens_output ?? null,
    created_at: data.created_at,
  };
}

// =============================================================================
// POST — streaming de insights con callbacks
// =============================================================================

export type StreamPhase =
  | "loading_snapshot"
  | "thinking"
  | "tool_call"
  | "writing";

export interface StreamCallbacks {
  onStatus?: (phase: StreamPhase, detail?: Record<string, unknown>) => void;
  onResumen?: (text: string) => void;
  onInsight?: (insight: Insight) => void;
  onDone?: (info: {
    saved_id: string | null;
    tokens?: { input: number; output: number };
  }) => void;
  onError?: (message: string) => void;
}

/**
 * Lee el stream SSE devuelto por POST /api/insights y dispara los callbacks
 * a medida que llegan los eventos.
 */
export async function streamInsights(
  misionId: string,
  cb: StreamCallbacks,
): Promise<void> {
  const res = await fetch("/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mision_id: misionId }),
  });

  if (!res.ok || !res.body) {
    let message = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      message = json?.error ?? message;
    } catch {
      /* noop */
    }
    cb.onError?.(message);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Eventos SSE separados por doble newline
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const ev of events) parseAndDispatch(ev, cb);
  }

  // Flush del último event si quedó algo
  if (buffer.trim()) parseAndDispatch(buffer, cb);
}

// -----------------------------------------------------------------------------
// Parser de un evento SSE individual
// -----------------------------------------------------------------------------

function parseAndDispatch(raw: string, cb: StreamCallbacks) {
  const lines = raw.split("\n");
  let event = "message";
  let dataStr = "";
  for (const line of lines) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
  }
  if (!dataStr) return;

  let data: any;
  try {
    data = JSON.parse(dataStr);
  } catch {
    return;
  }

  switch (event) {
    case "status":
      cb.onStatus?.(data.phase as StreamPhase, data);
      break;
    case "resumen":
      cb.onResumen?.(data.text ?? "");
      break;
    case "insight":
      cb.onInsight?.(data as Insight);
      break;
    case "done":
      cb.onDone?.(data);
      break;
    case "error":
      cb.onError?.(data.message ?? "Error desconocido");
      break;
  }
}
