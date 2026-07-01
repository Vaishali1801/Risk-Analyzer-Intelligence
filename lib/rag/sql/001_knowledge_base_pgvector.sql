CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_knowledge_documents (
  id text PRIMARY KEY,
  collection text NOT NULL,
  title text NOT NULL,
  source_type text NOT NULL,
  version text NOT NULL,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text NOT NULL,
  ingest_ready boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rag_knowledge_documents_tags_array CHECK (jsonb_typeof(tags) = 'array'),
  CONSTRAINT rag_knowledge_documents_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS rag_knowledge_chunks (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES rag_knowledge_documents(id) ON DELETE CASCADE,
  collection text NOT NULL,
  chunk_index integer NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  content_hash text NOT NULL,
  token_estimate integer NOT NULL,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rag_knowledge_chunks_chunk_index_nonnegative CHECK (chunk_index >= 0),
  CONSTRAINT rag_knowledge_chunks_token_estimate_nonnegative CHECK (token_estimate >= 0),
  CONSTRAINT rag_knowledge_chunks_tags_array CHECK (jsonb_typeof(tags) = 'array'),
  CONSTRAINT rag_knowledge_chunks_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT rag_knowledge_chunks_document_chunk_unique UNIQUE (document_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS rag_ingest_runs (
  id text PRIMARY KEY,
  status text NOT NULL,
  source text NOT NULL,
  document_count integer NOT NULL DEFAULT 0,
  chunk_count integer NOT NULL DEFAULT 0,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT rag_ingest_runs_document_count_nonnegative CHECK (document_count >= 0),
  CONSTRAINT rag_ingest_runs_chunk_count_nonnegative CHECK (chunk_count >= 0),
  CONSTRAINT rag_ingest_runs_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT rag_ingest_runs_status_known CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS rag_knowledge_documents_collection_idx
  ON rag_knowledge_documents (collection);

CREATE INDEX IF NOT EXISTS rag_knowledge_documents_source_type_idx
  ON rag_knowledge_documents (source_type);

CREATE INDEX IF NOT EXISTS rag_knowledge_documents_tags_gin_idx
  ON rag_knowledge_documents USING gin (tags);

CREATE INDEX IF NOT EXISTS rag_knowledge_documents_metadata_gin_idx
  ON rag_knowledge_documents USING gin (metadata);

CREATE INDEX IF NOT EXISTS rag_knowledge_chunks_document_id_idx
  ON rag_knowledge_chunks (document_id);

CREATE INDEX IF NOT EXISTS rag_knowledge_chunks_collection_idx
  ON rag_knowledge_chunks (collection);

CREATE INDEX IF NOT EXISTS rag_knowledge_chunks_tags_gin_idx
  ON rag_knowledge_chunks USING gin (tags);

CREATE INDEX IF NOT EXISTS rag_knowledge_chunks_metadata_gin_idx
  ON rag_knowledge_chunks USING gin (metadata);

CREATE INDEX IF NOT EXISTS rag_knowledge_chunks_embedding_hnsw_idx
  ON rag_knowledge_chunks USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;
