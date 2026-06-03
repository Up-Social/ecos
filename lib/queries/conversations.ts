import { createClient } from "@/lib/supabase/client";
import type {
  Conversation,
  Message,
  ConversationSource,
  MessageRole,
  EntityType,
} from "@/lib/supabase/types";

// -----------------------------------------------------------------------------
// Persistencia de conversaciones (Fase 09), desde el browser.
// SOLO persistencia: no llama a ninguna IA. Opera bajo RLS de propiedad
// (cada usuario gestiona sus conversaciones). `user_id` lo rellena la BD
// (DEFAULT auth.uid()).
// -----------------------------------------------------------------------------

const supabase = createClient();

// =============================================================================
// Conversaciones
// =============================================================================

/** Lista las conversaciones del usuario, de la más reciente a la más antigua. */
export async function listConversations() {
  return supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false })
    .returns<Conversation[]>();
}

export async function getConversation(id: string) {
  return supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single<Conversation>();
}

/** Crea una conversación (title opcional). */
export async function createConversation(title?: string | null) {
  return supabase
    .from("conversations")
    .insert({ title: title?.trim() || null })
    .select()
    .single<Conversation>();
}

/** Renombra una conversación. */
export async function renameConversation(id: string, title: string) {
  return supabase
    .from("conversations")
    .update({ title: title.trim() })
    .eq("id", id)
    .select()
    .single<Conversation>();
}

/** Elimina una conversación (cascada a mensajes y fuentes). */
export async function deleteConversation(id: string) {
  return supabase.from("conversations").delete().eq("id", id);
}

// =============================================================================
// Mensajes (persistencia; sin IA)
// =============================================================================

export async function getMessages(conversationId: string) {
  return supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .returns<Message[]>();
}

export async function addMessage(input: {
  conversation_id: string;
  role: MessageRole;
  content: string;
}) {
  return supabase.from("messages").insert(input).select().single<Message>();
}

// =============================================================================
// Fuentes de un mensaje (entidades que respaldan la respuesta)
// =============================================================================

export async function getMessageSources(messageId: string) {
  return supabase
    .from("conversation_sources")
    .select("*")
    .eq("message_id", messageId)
    .returns<ConversationSource[]>();
}

export async function addConversationSource(input: {
  message_id: string;
  entity_type: EntityType;
  entity_id: string;
  score?: number | null;
}) {
  return supabase
    .from("conversation_sources")
    .insert({
      message_id: input.message_id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      score: input.score ?? null,
    })
    .select()
    .single<ConversationSource>();
}
