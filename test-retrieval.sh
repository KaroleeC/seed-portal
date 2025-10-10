#!/bin/bash
# Quick test script for retrieval system

echo "=== Retrieval System Health Check ==="
echo ""

echo "1. Checking pgvector extension..."
doppler run --command "psql \$DATABASE_URL -c \"SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';\"" 2>/dev/null | grep vector
echo ""

echo "2. Checking tables..."
doppler run --command "psql \$DATABASE_URL -c \"SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('ai_documents', 'ai_chunks') ORDER BY tablename;\"" 2>/dev/null | grep ai_
echo ""

echo "3. Checking HNSW index..."
doppler run --command "psql \$DATABASE_URL -c \"SELECT indexname FROM pg_indexes WHERE tablename = 'ai_chunks' AND indexname LIKE '%hnsw%';\"" 2>/dev/null | grep hnsw
echo ""

echo "4. Checking API health..."
curl -s http://localhost:5001/api/health | jq -r '.status' 2>/dev/null || echo "API not responding"
echo ""

echo "5. Checking indexed documents..."
doppler run --command "psql \$DATABASE_URL -c \"SELECT COUNT(*) as doc_count FROM ai_documents;\"" 2>/dev/null | grep -A1 doc_count | tail -1
echo ""

echo "6. Checking indexed chunks..."
doppler run --command "psql \$DATABASE_URL -c \"SELECT COUNT(*) as chunk_count FROM ai_chunks;\"" 2>/dev/null | grep -A1 chunk_count | tail -1
echo ""

echo "=== All checks complete ==="
echo ""
echo "Next steps:"
echo "1. Open Support mode in the UI"
echo "2. Attach a client folder with financial documents"
echo "3. Watch server logs for: [AIIndexWorker] Indexing N files"
echo "4. Ask a question about the documents"
echo "5. Check if retrieval is used (faster response, more relevant)"
