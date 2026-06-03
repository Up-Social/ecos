// -----------------------------------------------------------------------------
// Embedding de texto en el servidor (Fase 12).
//
// SOLO SERVER: lee process.env (OPENAI_API_KEY...). No importar desde el cliente.
// Debe usar el MISMO modelo/dimensión que el worker (lib worker /api/embeddings),
// o el coseno frente a los embeddings almacenados no sería comparable.
// Default: OpenAI text-embedding-3-small / 1536 (decisión Fase 10).
// -----------------------------------------------------------------------------

const PROVIDER = (process.env.EMBEDDINGS_PROVIDER ?? "openai").toLowerCase();
const MODEL =
  process.env.EMBEDDINGS_MODEL ??
  (PROVIDER === "voyage" ? "voyage-3" : "text-embedding-3-small");
const DIMENSION = Number(process.env.EMBEDDINGS_DIMENSION ?? "1536");
const API_KEY =
  process.env.EMBEDDINGS_API_KEY ??
  process.env.OPENAI_API_KEY ??
  process.env.VOYAGE_API_KEY ??
  "";

/** Embebe un texto y devuelve su vector. Lanza si falta la clave o el proveedor falla. */
export async function embedText(text: string): Promise<number[]> {
  const input = text.trim();
  if (!input) throw new Error("Texto vacío para embeber");
  if (!API_KEY) {
    throw new Error("OPENAI_API_KEY (o EMBEDDINGS_API_KEY) no configurada");
  }
  if (PROVIDER === "openai") return embedOpenAI(input);
  if (PROVIDER === "voyage") return embedVoyage(input);
  throw new Error(`Proveedor de embeddings no soportado: ${PROVIDER}`);
}

async function embedOpenAI(input: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, input, dimensions: DIMENSION }),
  });
  if (!res.ok) throw new Error(`OpenAI embeddings ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

async function embedVoyage(input: string): Promise<number[]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, input: [input], output_dimension: DIMENSION }),
  });
  if (!res.ok) throw new Error(`Voyage embeddings ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}
