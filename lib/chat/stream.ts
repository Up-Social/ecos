import type { ChatRelatedEntity, ChatSource } from "@/lib/supabase/types";

// -----------------------------------------------------------------------------
// Cliente SSE del asistente (Fase 14). Hace POST /api/chat y parsea el stream
// de eventos (event:/data:) que emite el backend GraphRAG (Fase 13).
//
// EventSource solo admite GET; aquí usamos fetch + ReadableStream para POST.
// -----------------------------------------------------------------------------

export interface ChatStreamHandlers {
  onStatus?: (phase: string) => void;
  onSources?: (sources: ChatSource[]) => void;
  onRelated?: (related: ChatRelatedEntity[]) => void;
  onTrace?: (trace: unknown) => void;
  onDelta?: (text: string) => void;
  onDone?: (info: { conversation_id: string | null; message_id: string | null }) => void;
  onError?: (message: string) => void;
}

export async function streamChat(
  body: { message: string; conversationId?: string },
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    handlers.onError?.(e instanceof Error ? e.message : "Error de red");
    return;
  }

  if (!res.ok || !res.body) {
    let msg = "No se pudo contactar con el asistente";
    try {
      const j = await res.json();
      msg = j?.error ?? msg;
    } catch {
      /* respuesta no-JSON */
    }
    handlers.onError?.(msg);
    return;
  }

  const dispatch = (event: string, data: unknown) => {
    switch (event) {
      case "status":
        handlers.onStatus?.((data as { phase: string }).phase);
        break;
      case "sources":
        handlers.onSources?.(data as ChatSource[]);
        break;
      case "related":
        handlers.onRelated?.(data as ChatRelatedEntity[]);
        break;
      case "trace":
        handlers.onTrace?.(data);
        break;
      case "delta":
        handlers.onDelta?.((data as { text: string }).text);
        break;
      case "done":
        handlers.onDone?.(data as { conversation_id: string | null; message_id: string | null });
        break;
      case "error":
        handlers.onError?.((data as { message: string }).message);
        break;
    }
  };

  const parseBlock = (raw: string) => {
    let event = "message";
    let data = "";
    for (const line of raw.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    if (!data) return;
    try {
      dispatch(event, JSON.parse(data));
    } catch {
      /* bloque incompleto/no-JSON — ignorar */
    }
  };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) >= 0) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (raw.trim()) parseBlock(raw);
      }
    }
    if (buffer.trim()) parseBlock(buffer);
  } catch (e) {
    if ((e as Error)?.name !== "AbortError") {
      handlers.onError?.(e instanceof Error ? e.message : "Error de streaming");
    }
  }
}
