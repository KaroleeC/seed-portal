-- Migration: Add AI Feature Tables
-- Date: 2025-10-09
-- Description: Creates AI conversation, message, document, and chunk tables
-- Tables: 4 (ai_conversations, ai_messages, ai_documents, ai_chunks)
-- Risk: Low (additive only, requires vector extension)
-- Estimated time: <5 seconds

BEGIN;

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- AI Conversations - User conversations with AI
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  mode TEXT NOT NULL, -- 'sell' | 'support'
  title TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- ============================================================================
-- AI Messages - Individual messages in conversations
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_messages (
  id SERIAL PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  attachments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_messages_conversation_idx ON ai_messages(conversation_id);

-- ============================================================================
-- AI Documents - Box documents for RAG
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_documents (
  id SERIAL PRIMARY KEY,
  file_id TEXT NOT NULL UNIQUE, -- Box file ID
  name TEXT NOT NULL,
  sha1 TEXT,
  etag TEXT,
  size INTEGER,
  modified_at TIMESTAMPTZ,
  version TEXT, -- derived from sha1/etag/size+modified
  client_id TEXT, -- optional future filter
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AI Chunks - Document chunks with embeddings for RAG
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_chunks (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL, -- OpenAI ada-002 embeddings
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_chunks_document_idx ON ai_chunks(document_id);

-- Optional: Create HNSW index for faster similarity search (can add later as needed)
-- CREATE INDEX ai_chunks_embedding_idx ON ai_chunks USING hnsw (embedding vector_cosine_ops);

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================

-- Run these to verify:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'ai_%' ORDER BY table_name;
-- SELECT COUNT(*) FROM ai_conversations; -- Should return 0

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

-- Uncomment and run if you need to rollback:
-- BEGIN;
-- DROP TABLE IF EXISTS ai_chunks CASCADE;
-- DROP TABLE IF EXISTS ai_documents CASCADE;
-- DROP TABLE IF EXISTS ai_messages CASCADE;
-- DROP TABLE IF EXISTS ai_conversations CASCADE;
-- COMMIT;
