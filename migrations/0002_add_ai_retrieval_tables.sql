-- AI Documents table: tracks Box files and their versions
CREATE TABLE IF NOT EXISTS ai_documents (
  id SERIAL PRIMARY KEY,
  file_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sha1 TEXT,
  etag TEXT,
  size INTEGER,
  modified_at TIMESTAMP,
  version TEXT,
  client_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_documents_file_id ON ai_documents(file_id);
CREATE INDEX IF NOT EXISTS idx_ai_documents_version ON ai_documents(version);
CREATE INDEX IF NOT EXISTS idx_ai_documents_client_id ON ai_documents(client_id);

-- AI Chunks table: stores text chunks with vector embeddings
CREATE TABLE IF NOT EXISTS ai_chunks (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chunks_document_id ON ai_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_chunks_document_chunk ON ai_chunks(document_id, chunk_index);

-- HNSW index for fast vector similarity search (cosine distance)
-- m=16, ef_construction=64 are good defaults for most use cases
CREATE INDEX IF NOT EXISTS idx_ai_chunks_embedding_hnsw ON ai_chunks 
  USING hnsw (embedding vector_cosine_ops) 
  WITH (m = 16, ef_construction = 64);
