import { z } from "zod";

// -----------------------------------------------------------------------------
// Schemas Zod de conversaciones (Fase 09). Solo persistencia (sin IA).
// Mensajes de validación en español.
// -----------------------------------------------------------------------------

export const conversationCreateSchema = z.object({
  title: z.string().max(200, "Título demasiado largo").optional().nullable(),
});

export const conversationRenameSchema = z.object({
  title: z.string().min(1, "El título es obligatorio").max(200, "Título demasiado largo"),
});

export const messageRoleEnum = z.enum(["user", "assistant", "system"]);

export const messageCreateSchema = z.object({
  conversation_id: z.string().uuid(),
  role: messageRoleEnum,
  content: z.string().min(1, "El mensaje no puede estar vacío"),
});

export type ConversationCreateValues = z.input<typeof conversationCreateSchema>;
export type ConversationRenameValues = z.input<typeof conversationRenameSchema>;
export type MessageCreateValues = z.input<typeof messageCreateSchema>;
