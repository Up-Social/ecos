import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type {
  Tool,
  ToolUseBlock,
  MessageParam,
  TextBlockParam,
  ToolResultBlockParam,
} from "@anthropic-ai/sdk/resources/messages";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// =============================================================================
// /api/insights
//
// GET  ?mision_id=...   → última fila de insights_history (caché)
// POST { mision_id }    → streaming SSE de un nuevo análisis con Claude
//                          (incluye tool-use loop + persistencia al final)
// =============================================================================

const MODEL = "claude-opus-4-6";

// -----------------------------------------------------------------------------
// Tipos
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

export interface InsightsResponse {
  insights: Insight[];
  resumen: string;
}

// =============================================================================
// System prompt: pedir NDJSON (una línea = un objeto)
// =============================================================================

const SYSTEM_PROMPT = `Eres analista estratégico experto del modelo ECOS.

ECOS modela un ecosistema de innovación social con esta cadena:
  Misión → Retos → Innovaciones → Hallazgos → Recomendaciones
  Agentes ejecutan Proyectos que generan Innovaciones.

Tu tarea: a partir de un snapshot agregado de una misión, generar 3 a 5
insights estratégicos accionables. Cada insight debe ser:
  - Conciso (1-2 frases)
  - Basado en datos concretos del snapshot
  - Útil para tomar decisiones (no descriptivo)
  - En español

Detecta especialmente:
  - Vacíos: retos sin innovaciones, fases del pipeline vacías
  - Concentración: agentes dominantes, retos sobreatendidos
  - Madurez: distribución de niveles de evidencia
  - Cuellos de botella: muchos prototipos pero pocos escalados
  - Cobertura desigual entre fases del ciclo

HERRAMIENTAS disponibles si necesitas zoom en algo concreto:
  - get_reto_detail(reto_id)         → reto + sus innovaciones y hallazgos
  - get_innovacion_detail(id)        → innovación + hallazgos completos
  - get_hallazgo_detail(id)          → hallazgo con descripción y evidencia

Úsalas SOLO si el snapshot agregado no te basta para un insight concreto.

FORMATO DE SALIDA — NDJSON (una línea = un objeto JSON):

Línea 1 (siempre primero):
{"resumen":"frase de síntesis del estado de la misión"}

Líneas siguientes (3 a 5, una por insight):
{"tipo":"vacio|oportunidad|concentracion|madurez|cuello_botella|fortaleza","titulo":"...","descripcion":"...","prioridad":"alta|media|baja","evidencia":"cifra clave"}

REGLAS ESTRICTAS:
- Una línea = un objeto JSON completo. Sin saltos de línea dentro del JSON.
- Sin markdown, sin backticks, sin comentarios.
- No envuelvas en arrays. Cada línea es un objeto suelto.
- Empieza directamente con la línea del resumen.`;

// =============================================================================
// Tool definitions
// =============================================================================

const TOOLS: Tool[] = [
  {
    name: "get_reto_detail",
    description:
      "Devuelve un reto con sus innovaciones vinculadas y el conteo de hallazgos por innovación. Úsalo si necesitas entender qué hay detrás de un reto concreto que te llama la atención.",
    input_schema: {
      type: "object",
      properties: {
        reto_id: { type: "string", description: "UUID del reto" },
      },
      required: ["reto_id"],
    },
  },
  {
    name: "get_innovacion_detail",
    description:
      "Devuelve una innovación con su descripción completa, estado, nivel de impacto y todos sus hallazgos. Úsalo si necesitas inspeccionar una innovación específica.",
    input_schema: {
      type: "object",
      properties: {
        innovacion_id: { type: "string", description: "UUID de la innovación" },
      },
      required: ["innovacion_id"],
    },
  },
  {
    name: "get_hallazgo_detail",
    description:
      "Devuelve un hallazgo con su descripción completa, evidencia cuantitativa, fuente y enlace. Úsalo si necesitas profundizar en una evidencia concreta.",
    input_schema: {
      type: "object",
      properties: {
        hallazgo_id: { type: "string", description: "UUID del hallazgo" },
      },
      required: ["hallazgo_id"],
    },
  },
];

// =============================================================================
// GET — última lectura del histórico (caché)
// =============================================================================

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const misionId = searchParams.get("mision_id");
  if (!misionId) {
    return NextResponse.json({ error: "Falta mision_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("insights_history")
    .select("id, resumen, insights, created_at, model, tokens_input, tokens_output")
    .eq("mision_id", misionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Sin histórico" }, { status: 404 });
  }
  return NextResponse.json(data);
}

// =============================================================================
// POST — streaming + tools + persistencia
// =============================================================================

export async function POST(req: Request) {
  let payload: { mision_id?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }
  const misionId = payload.mision_id;
  if (!misionId) {
    return NextResponse.json({ error: "Falta mision_id" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no configurada en el servidor" },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ---------------------------------------------------------------------------
  // Stream SSE: emite eventos status / resumen / insight / done / error
  // ---------------------------------------------------------------------------

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const collectedInsights: Insight[] = [];
      let collectedResumen = "";

      const emitNdjsonLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        try {
          const obj = JSON.parse(trimmed);
          if (typeof obj.resumen === "string") {
            collectedResumen = obj.resumen;
            send("resumen", { text: obj.resumen });
          } else if (typeof obj.tipo === "string") {
            collectedInsights.push(obj as Insight);
            send("insight", obj);
          }
        } catch {
          // línea incompleta o inválida — ignorar
        }
      };

      try {
        // -------------------------------------------------------------------
        // 1. Cargar snapshot desde las vistas analíticas
        // -------------------------------------------------------------------
        send("status", { phase: "loading_snapshot" });

        const [
          kpisRes,
          carteraRes,
          coberturaRes,
          vaciosRes,
          hallazgosRes,
          recomendacionesRes,
          agentesRes,
          evidenciaRes,
          pipelineRes,
        ] = await Promise.all([
          supabase
            .from("v_kpis_mision")
            .select("*")
            .eq("mision_id", misionId)
            .maybeSingle(),
          supabase
            .from("v_cartera_innovacion")
            .select("estado, nivel_impacto, total")
            .eq("mision_id", misionId),
          supabase
            .from("v_cobertura_retos")
            .select("reto_id, reto_nombre, total_innovaciones")
            .eq("mision_id", misionId)
            .order("total_innovaciones", { ascending: false }),
          supabase
            .from("v_retos_sin_innovacion")
            .select("reto_id, reto_nombre")
            .eq("mision_id", misionId),
          supabase
            .from("v_hallazgos_reto")
            .select("reto_nombre, titulo, nivel_evidencia")
            .eq("mision_id", misionId),
          supabase
            .from("v_recomendaciones_mision")
            .select("titulo, estado, alcance")
            .eq("mision_id", misionId),
          supabase
            .from("v_agentes_mision")
            .select("nombre, total_proyectos")
            .eq("mision_id", misionId)
            .order("total_proyectos", { ascending: false }),
          supabase
            .from("v_nivel_evidencia_mision")
            .select("nivel_evidencia, total")
            .eq("mision_id", misionId),
          supabase
            .from("v_pipeline_madurez")
            .select("estado, total")
            .eq("mision_id", misionId),
        ]);

        if (!kpisRes.data) {
          send("error", {
            message: "La misión no existe o no tiene actividad",
          });
          controller.close();
          return;
        }

        const snapshot = {
          kpis: kpisRes.data,
          cartera: carteraRes.data ?? [],
          cobertura: coberturaRes.data ?? [],
          retos_sin_innovacion: vaciosRes.data ?? [],
          hallazgos: hallazgosRes.data ?? [],
          recomendaciones: recomendacionesRes.data ?? [],
          agentes: agentesRes.data ?? [],
          evidencia: evidenciaRes.data ?? [],
          pipeline: pipelineRes.data ?? [],
        };

        // -------------------------------------------------------------------
        // 2. Loop de tool use con streaming
        // -------------------------------------------------------------------
        const client = new Anthropic({ apiKey });

        const messages: MessageParam[] = [
          {
            role: "user",
            content: `Snapshot de la misión:\n\n${JSON.stringify(snapshot, null, 2)}`,
          },
        ];

        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        const MAX_ROUNDS = 4; // safeguard contra loops infinitos
        let round = 0;

        while (round < MAX_ROUNDS) {
          round += 1;
          send("status", { phase: round === 1 ? "thinking" : "writing" });

          const messageStream = client.messages.stream({
            model: MODEL,
            max_tokens: 2000,
            system: SYSTEM_PROMPT,
            tools: TOOLS,
            messages,
          });

          let textBuffer = "";

          for await (const event of messageStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              textBuffer += event.delta.text;
              const lines = textBuffer.split("\n");
              textBuffer = lines.pop() ?? "";
              for (const line of lines) emitNdjsonLine(line);
            }
          }

          // Flush del buffer final
          if (textBuffer.trim()) emitNdjsonLine(textBuffer);

          const finalMsg = await messageStream.finalMessage();
          totalInputTokens += finalMsg.usage.input_tokens;
          totalOutputTokens += finalMsg.usage.output_tokens;

          if (finalMsg.stop_reason !== "tool_use") {
            // Claude terminó de generar → salir del loop
            break;
          }

          // -----------------------------------------------------------------
          // Hay tool_use → ejecutar tools y continuar
          // -----------------------------------------------------------------
          const toolUses = finalMsg.content.filter(
            (b): b is ToolUseBlock => b.type === "tool_use",
          );

          const toolResults: ToolResultBlockParam[] = [];
          for (const tu of toolUses) {
            send("status", {
              phase: "tool_call",
              tool: tu.name,
              input: tu.input,
            });
            const result = await executeTool(supabase, tu.name, tu.input);
            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: JSON.stringify(result),
            });
          }

          // Append a la conversación: assistant message + tool_results
          messages.push({
            role: "assistant",
            content: finalMsg.content,
          });
          messages.push({
            role: "user",
            content: toolResults,
          });
        }

        // -------------------------------------------------------------------
        // 3. Persistir en insights_history
        // -------------------------------------------------------------------
        const { data: saved } = await supabase
          .from("insights_history")
          .insert({
            mision_id: misionId,
            resumen: collectedResumen || null,
            insights: collectedInsights,
            model: MODEL,
            tokens_input: totalInputTokens,
            tokens_output: totalOutputTokens,
            generated_by: user?.id ?? null,
          })
          .select("id")
          .single();

        send("done", {
          saved_id: saved?.id ?? null,
          tokens: {
            input: totalInputTokens,
            output: totalOutputTokens,
          },
        });
        controller.close();
      } catch (e: any) {
        send("error", { message: e?.message ?? "Error inesperado" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// =============================================================================
// Tool execution
// =============================================================================

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

async function executeTool(
  supabase: ServerSupabase,
  name: string,
  input: unknown,
): Promise<unknown> {
  const args = (input ?? {}) as Record<string, string>;

  switch (name) {
    case "get_reto_detail": {
      const { data } = await supabase
        .from("retos")
        .select(
          `
          id,
          nombre,
          descripcion,
          innovaciones_retos (
            innovacion:innovaciones (
              id,
              nombre,
              estado,
              nivel_impacto,
              hallazgos ( count )
            )
          )
        `,
        )
        .eq("id", args.reto_id)
        .maybeSingle();
      return data ?? { error: "reto no encontrado" };
    }

    case "get_innovacion_detail": {
      const { data } = await supabase
        .from("innovaciones")
        .select(
          `
          id,
          nombre,
          descripcion,
          estado,
          nivel_impacto,
          n_participantes,
          proyecto:proyectos ( id, nombre, financiador ),
          hallazgos ( id, titulo, nivel_evidencia, validado )
        `,
        )
        .eq("id", args.innovacion_id)
        .maybeSingle();
      return data ?? { error: "innovación no encontrada" };
    }

    case "get_hallazgo_detail": {
      const { data } = await supabase
        .from("hallazgos")
        .select(
          `
          id,
          titulo,
          descripcion,
          nivel_evidencia,
          evidencia_cuantitativa,
          fuente,
          enlace,
          validado,
          innovacion:innovaciones ( id, nombre )
        `,
        )
        .eq("id", args.hallazgo_id)
        .maybeSingle();
      return data ?? { error: "hallazgo no encontrado" };
    }

    default:
      return { error: `tool desconocida: ${name}` };
  }
}
