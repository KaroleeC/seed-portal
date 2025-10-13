# AI Retrieval System (Priority 3) - Setup Guide

## What We Built

A production-ready vector search system for Box documents using:

- **pgvector** for native Postgres vector similarity search
- **BullMQ** for reliable async indexing jobs
- **OpenAI embeddings** (text-embedding-3-small, 1536 dimensions)
- **Hybrid retrieval**: tries vector search first, falls back to full extraction

## Architecture

### 1. Database Schema

- `ai_documents`: Tracks Box files with version info (sha1/etag)
- `ai_chunks`: Stores text chunks with vector embeddings
- HNSW index on embeddings for fast cosine similarity search

### 2. Indexing Flow

```
User attaches folder → /api/ai/box/resolve
  ↓
Resolve files (BFS + relevance ranking)
  ↓
Enqueue indexing job → BullMQ "ai-index" queue
  ↓
Worker processes job:
  - Extract text (reuses doc-extract.ts parsers)
  - Chunk text (3000 chars, 200 overlap)
  - Embed chunks (OpenAI API)
  - Store in ai_documents + ai_chunks
```

### 3. Query Flow

```
User asks question → /api/ai/query or /api/ai/query/stream
  ↓
extractTextForClient() tries:
  1. Vector search (searchTopChunksForFiles)
     - Embed query
     - pgvector cosine search (<=> operator)
     - Return top-K chunks (widget: 8, assistant: 16)
  2. Fallback to full extraction if retrieval fails
  ↓
Feed chunks to GPT with strict prompt
```

## Files Created/Modified

### New Files

- `migrations/0001_add_pgvector_extension.sql` - Enable pgvector
- `migrations/0002_add_ai_retrieval_tables.sql` - Tables + HNSW index
- `server/ai/config.ts` - Central limits per surface (topK added)
- `server/ai/relevance.ts` - Financial keyword ranking
- `server/ai/pipeline.ts` - Resolve + extract orchestration
- `server/ai/retrieval/chunker.ts` - Text chunking
- `server/ai/retrieval/embed.ts` - OpenAI embeddings
- `server/ai/retrieval/indexer.ts` - Index Box files
- `server/ai/retrieval/search.ts` - pgvector search
- `server/workers/ai-index-worker.ts` - BullMQ worker

### Modified Files

- `shared/schema.ts` - Added pgvector custom type + ai_documents/ai_chunks tables
- `server/queue.ts` - Added ai-index queue
- `server/index.ts` - Start AI index worker on boot
- `server/routes.ts` - Enqueue indexing in /api/ai/box/resolve

## Setup Instructions

### 1. Run Migrations

```bash
cd seed-portal
# Apply migrations (ensure DATABASE_URL is set)
psql $DATABASE_URL -f migrations/0001_add_pgvector_extension.sql
psql $DATABASE_URL -f migrations/0002_add_ai_retrieval_tables.sql
```

### 2. Verify pgvector

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
-- Should return 1 row
```

### 3. Restart API

```bash
# Kill existing
lsof -t -iTCP:5001 -sTCP:LISTEN | xargs -I{} kill -TERM {} 2>/dev/null || true

# Start with Doppler
npm run dev:api:doppler
```

### 4. Verify Worker Started

Look for logs:

```
[Queue] ✅ BullMQ queues initialized
[AIIndexWorker] ✅ Worker started
```

## Configuration

### Limits (server/ai/config.ts)

```typescript
widget: {
  maxFiles: 15,
  topK: 8,        // 8 chunks per query
}
assistant: {
  maxFiles: 100,
  topK: 16,       // 16 chunks per query
}
```

### Worker Settings (server/workers/ai-index-worker.ts)

- Concurrency: 2 jobs in parallel
- Rate limit: 10 jobs/minute (avoid OpenAI quota)
- Retries: 2 attempts with exponential backoff

## Testing

### 1. Attach a folder in Support mode

- Should see indexing job enqueued in logs
- Worker processes in background

### 2. Ask a question

- First time: may use fallback (files not indexed yet)
- Subsequent: uses vector search if indexed

### 3. Monitor queue

```typescript
// In server console or admin endpoint
const { getAIIndexQueue } = require("./queue");
const queue = getAIIndexQueue();
const counts = await queue.getJobCounts();
console.log(counts); // { waiting, active, completed, failed }
```

## Troubleshooting

### pgvector not found

```sql
CREATE EXTENSION vector;
```

If fails, install pgvector on your Postgres instance.

### Worker not starting

- Check DATABASE_URL is set
- Verify Postgres is accessible
- Check logs for connection errors

### Retrieval returns empty

- Files may not be indexed yet (check queue)
- Check ai_documents table: `SELECT * FROM ai_documents LIMIT 5;`
- Check ai_chunks table: `SELECT COUNT(*) FROM ai_chunks;`

### Slow queries

- Verify HNSW index exists:

  ```sql
  SELECT indexname FROM pg_indexes WHERE tablename = 'ai_chunks';
  ```

- Tune HNSW parameters if needed (m, ef_construction)

## Next Steps

1. **Monitor performance**: Add timing logs for retrieval vs extraction
2. **Expand to folders**: Index folder contents recursively at resolve time
3. **Incremental updates**: Only re-index changed files (version check)
4. **Admin UI**: View indexed documents, queue status, re-index controls
5. **Metrics**: Track hit rate (retrieval vs fallback), latency, chunk quality

## Cost Considerations

- **OpenAI embeddings**: ~$0.0001/1K tokens
  - 100 files × 10 chunks/file × 750 tokens/chunk = ~$0.08
- **Storage**: Minimal (vectors are ~6KB each)
- **Compute**: Indexing is async, doesn't block requests

## Production Checklist

- [x] pgvector extension enabled
- [x] HNSW index created
- [x] BullMQ worker running
- [x] Graceful fallback to extraction
- [ ] Monitoring/alerting for queue failures
- [ ] Periodic cleanup of old chunks (optional)
- [ ] Rate limiting on indexing (done: 10/min)
