import { z } from "zod";

// -----------------------------------------------------------------------------
// Entrada del asistente GraphRAG (Fase 13). Validada en /api/chat.
// -----------------------------------------------------------------------------

export const chatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Escribe un mensaje")
    .max(2000, "El mensaje es demasiado largo"),
  // Conversación existente; si falta, se crea una nueva.
  conversationId: z.string().uuid().optional(),
});

export type ChatInput = z.infer<typeof chatSchema>;
