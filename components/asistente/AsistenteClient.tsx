"use client";

import { useCallback, useEffect, useRef, useState, Fragment } from "react";
import Link from "next/link";
import { Plus, Send, Trash2, MessageSquare, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  listConversations,
  getMessages,
  getMessageSources,
  deleteConversation,
} from "@/lib/queries/conversations";
import { streamChat } from "@/lib/chat/stream";
import { ENTITY_TYPE_LABELS } from "@/lib/schemas/relationship";
import type {
  Conversation,
  ChatSource,
  ChatRelatedEntity,
  EntityType,
} from "@/lib/supabase/types";

// =============================================================================
// Asistente GraphRAG (Fase 14) — UI tipo ChatGPT sobre /api/chat.
// Historial (Fase 09) + streaming + fuentes + citas + entidades relacionadas.
// =============================================================================

interface UIMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  related?: ChatRelatedEntity[];
  streaming?: boolean;
}

const PUBLIC_TYPES: EntityType[] = [
  "misiones",
  "retos",
  "agentes",
  "proyectos",
  "innovaciones",
];

const PHASE_LABEL: Record<string, string> = {
  retrieving: "Buscando información…",
  expanding: "Explorando relaciones…",
  building_context: "Preparando contexto…",
  answering: "Redactando respuesta…",
};

/** Enlace al detalle público de una entidad (si es de las explorables). */
function EntityRef({
  type,
  id,
  label,
}: {
  type: EntityType;
  id: string;
  label: string;
}) {
  if (PUBLIC_TYPES.includes(type)) {
    return (
      <Link
        href={`/explorar/${type}/${id}`}
        className="text-brand-600 hover:underline"
        target="_blank"
      >
        {label}
      </Link>
    );
  }
  return <span>{label}</span>;
}

/** Renderiza el texto del asistente convirtiendo [n] en chips de cita. */
function renderWithCitations(content: string, sources: ChatSource[]) {
  const parts = content.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (m) {
      const n = Number(m[1]);
      const src = sources.find((s) => s.cite === n);
      if (src) {
        return (
          <sup key={i} className="mx-0.5">
            <EntityRef type={src.entity_type} id={src.entity_id} label={`[${n}]`} />
          </sup>
        );
      }
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function AsistenteClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshConversations = useCallback(async () => {
    const { data } = await listConversations();
    setConversations(data ?? []);
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function selectConversation(id: string) {
    if (sending) return;
    setActiveId(id);
    setError(null);
    const { data: msgs } = await getMessages(id);
    const ui: UIMessage[] = [];
    for (const m of msgs ?? []) {
      if (m.role === "system") continue;
      const item: UIMessage = { role: m.role as "user" | "assistant", content: m.content };
      ui.push(item);
    }
    setMessages(ui);
    // Cargar fuentes de cada mensaje del asistente (en segundo plano).
    const assistantMsgs = (msgs ?? []).filter((m) => m.role === "assistant");
    await Promise.all(
      assistantMsgs.map(async (m, idx) => {
        const { data: srcs } = await getMessageSources(m.id);
        if (!srcs || srcs.length === 0) return;
        const mapped: ChatSource[] = srcs.map((s, i) => ({
          entity_type: s.entity_type,
          entity_id: s.entity_id,
          title: null,
          score: s.score ?? 0,
          origin: "vector",
          cite: i + 1,
        }));
        setMessages((prev) => {
          const next = [...prev];
          // localizar el idx-ésimo assistant en la UI
          let count = -1;
          for (let j = 0; j < next.length; j++) {
            if (next[j].role === "assistant") {
              count++;
              if (count === idx) {
                next[j] = { ...next[j], sources: mapped };
                break;
              }
            }
          }
          return next;
        });
      }),
    );
  }

  function newConversation() {
    if (sending) return;
    setActiveId(null);
    setMessages([]);
    setError(null);
  }

  async function handleDelete(id: string) {
    await deleteConversation(id);
    if (activeId === id) newConversation();
    await refreshConversations();
  }

  function patchLastAssistant(patch: (m: UIMessage) => UIMessage) {
    setMessages((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === "assistant") {
          next[i] = patch(next[i]);
          break;
        }
      }
      return next;
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "", streaming: true },
    ]);
    setSending(true);
    setPhase("retrieving");

    await streamChat(
      { message: text, conversationId: activeId ?? undefined },
      {
        onStatus: (p) => setPhase(p),
        onDelta: (d) => patchLastAssistant((m) => ({ ...m, content: m.content + d })),
        onSources: (s) => patchLastAssistant((m) => ({ ...m, sources: s })),
        onRelated: (r) => patchLastAssistant((m) => ({ ...m, related: r })),
        onDone: async (info) => {
          patchLastAssistant((m) => ({ ...m, streaming: false }));
          if (info.conversation_id && info.conversation_id !== activeId) {
            setActiveId(info.conversation_id);
          }
          setSending(false);
          setPhase(null);
          await refreshConversations();
        },
        onError: (msg) => {
          setError(msg);
          patchLastAssistant((m) => ({ ...m, streaming: false }));
          setSending(false);
          setPhase(null);
        },
      },
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7.5rem)] max-w-6xl gap-4 px-4 py-4">
      {/* Historial */}
      <aside className="hidden w-64 shrink-0 flex-col rounded-lg border border-slate-200 bg-slate-50 md:flex">
        <div className="p-3">
          <Button onClick={newConversation} className="w-full" disabled={sending}>
            <Plus className="h-4 w-4" /> Nueva conversación
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {conversations.length === 0 ? (
            <p className="px-2 py-4 text-xs text-slate-400">Aún no hay conversaciones.</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`group mb-1 flex items-center gap-2 rounded-md px-2 py-2 text-sm ${
                  activeId === c.id ? "bg-white shadow-sm" : "hover:bg-white/70"
                }`}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-slate-400" />
                <button
                  onClick={() => selectConversation(c.id)}
                  className="flex-1 truncate text-left text-slate-700"
                  title={c.title ?? "Sin título"}
                >
                  {c.title ?? "Sin título"}
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="opacity-0 transition group-hover:opacity-100"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Conversación */}
      <section className="flex flex-1 flex-col rounded-lg border border-slate-200 bg-white">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
              <Sparkles className="mb-2 h-8 w-8" />
              <p className="text-sm">
                Pregunta sobre el ecosistema: misiones, retos, agentes, proyectos…
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))
          )}
          {sending && phase && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {PHASE_LABEL[phase] ?? "Procesando…"}
            </div>
          )}
        </div>

        {error && (
          <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Escribe tu pregunta…"
              disabled={sending}
              className="max-h-40 flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50"
            />
            <Button onClick={send} disabled={sending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const sources = message.sources ?? [];

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
          isUser ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800"
        }`}
      >
        <div className="whitespace-pre-wrap leading-relaxed">
          {isUser ? message.content : renderWithCitations(message.content, sources)}
          {message.streaming && message.content === "" && (
            <span className="text-slate-400">…</span>
          )}
        </div>

        {/* Fuentes */}
        {!isUser && sources.length > 0 && (
          <div className="mt-3 border-t border-slate-200 pt-2">
            <p className="mb-1 text-xs font-medium text-slate-500">Fuentes</p>
            <ol className="space-y-0.5 text-xs text-slate-600">
              {sources.map((s) => (
                <li key={`${s.entity_type}:${s.entity_id}`}>
                  <span className="text-slate-400">[{s.cite}]</span>{" "}
                  <span className="text-slate-400">{ENTITY_TYPE_LABELS[s.entity_type]}:</span>{" "}
                  <EntityRef
                    type={s.entity_type}
                    id={s.entity_id}
                    label={s.title ?? s.entity_id.slice(0, 8)}
                  />{" "}
                  <span className="text-slate-300">· {(s.score * 100).toFixed(0)}%</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Entidades relacionadas */}
        {!isUser && message.related && message.related.length > 0 && (
          <div className="mt-2 border-t border-slate-200 pt-2">
            <p className="mb-1 text-xs font-medium text-slate-500">Entidades relacionadas</p>
            <div className="flex flex-wrap gap-1.5">
              {message.related.slice(0, 12).map((r) => (
                <span
                  key={`${r.entity_type}:${r.entity_id}`}
                  className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200"
                  title={r.relation_name ?? r.relation_code ?? r.direction}
                >
                  <EntityRef
                    type={r.entity_type}
                    id={r.entity_id}
                    label={`${ENTITY_TYPE_LABELS[r.entity_type]} · ${r.entity_id.slice(0, 6)}`}
                  />
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
