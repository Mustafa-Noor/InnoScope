#!/bin/bash
# Quick test script for feasibility endpoints

echo "=== Feasibility Assessment Testing ==="
echo ""

# Test 1: Direct JSON assessment
echo "[1] Testing POST /feasibility/assess (direct JSON)"
echo "---"
curl -X POST http://localhost:8000/feasibility/assess \
  -H "Content-Type: application/json" \
  -d '{
    "refined_summary": "Build a mobile app for task management with real-time sync",
    "domain": "mobile-development",
    "goals": ["MVP in 3 months", "Support iOS and Android"],
    "key_topics": ["React Native", "Firebase", "Real-time sync"]
  }' | python -m json.tool

echo ""
echo ""

# Test 2: File-based (non-streaming)
echo "[2] Testing POST /feasibility/generate (file-based, non-streaming)"
echo "---"
echo "Note: Requires a test PDF/DOCX file"
echo "curl -X POST http://localhost:8000/feasibility/generate -F 'file=@project.pdf'"
echo ""

# Test 3: File-based streaming
echo "[3] Testing POST /feasibility/generate-stream (file-based, streaming)"
echo "---"
echo "Note: Shows real-time progress updates with SSE"
echo "curl -X POST http://localhost:8000/feasibility/generate-stream -F 'file=@project.pdf' --no-buffer"
echo ""
echo "Expected streaming events:"
echo "  1. extracting - Extracting content"
echo "  2. extraction_complete - Document ready"
echo "  3. embeddings_ready - Embeddings computed"
echo "  4. features_extracted - Features extracted"
echo "  5. ml_prediction_ready - ML prediction done"
echo "  6. fallback_ready - Fallback computed"
echo "  7. score_decided - Score finalized"
echo "  8. report_generated - Report complete"
echo "  9. complete - **STREAM COMPLETE**"
echo ""
