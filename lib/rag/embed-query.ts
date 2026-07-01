import OpenAI from "openai";

export const DEFAULT_QUERY_EMBEDDING_MODEL = "text-embedding-3-small";
export const QUERY_EMBEDDING_DIMENSIONS = 1536;

type EmbeddingClient = {
  embeddings: {
    create(input: { model: string; input: string }): Promise<{
      data: Array<{ embedding: number[] }>;
    }>;
  };
};

export type EmbedRetrievalQueryOptions = {
  apiKey?: string;
  model?: string;
  client?: EmbeddingClient;
};

export type RetrievalQueryEmbedding = {
  embedding: number[];
  model: string;
  dimensions: 1536;
};

function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("RAG query embedding helpers can only be used on the server.");
  }
}

function requireOpenAiApiKey(apiKey?: string) {
  const value = apiKey ?? process.env.OPENAI_API_KEY;
  if (!value || !value.trim()) {
    throw new Error("OPENAI_API_KEY is required to embed a RAG retrieval query.");
  }
  return value;
}

export function getRagQueryEmbeddingModel(model?: string) {
  return model ?? process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_QUERY_EMBEDDING_MODEL;
}

export function validateQueryEmbeddingDimension(embedding: readonly number[]): asserts embedding is number[] {
  if (embedding.length !== QUERY_EMBEDDING_DIMENSIONS) {
    throw new Error(`Query embedding dimension mismatch: expected ${QUERY_EMBEDDING_DIMENSIONS}, received ${embedding.length}`);
  }
  if (!embedding.every(Number.isFinite)) {
    throw new Error("Query embedding contains a non-finite value.");
  }
}

// Server-side helper only. This generates a query embedding when explicitly
// called; it does not retrieve KB chunks or execute vector search.
export async function embedRetrievalQueryText(
  queryText: string,
  options: EmbedRetrievalQueryOptions = {}
): Promise<RetrievalQueryEmbedding> {
  assertServerRuntime();
  const input = queryText.trim();
  if (!input) {
    throw new Error("Query text is required to create a RAG retrieval embedding.");
  }

  const model = getRagQueryEmbeddingModel(options.model);
  const client = options.client ?? new OpenAI({ apiKey: requireOpenAiApiKey(options.apiKey) });
  const response = await client.embeddings.create({ model, input });
  const embedding = response.data[0]?.embedding;

  if (!Array.isArray(embedding)) {
    throw new Error("OpenAI embedding response did not include an embedding vector.");
  }

  validateQueryEmbeddingDimension(embedding);

  return {
    embedding,
    model,
    dimensions: QUERY_EMBEDDING_DIMENSIONS
  };
}
