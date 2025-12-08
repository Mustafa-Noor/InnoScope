from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import json
import asyncio

router = APIRouter(
    prefix="/test",
    tags=["Test"]
)

@router.get("/stream")
async def test_stream():
    """Test streaming endpoint to debug SSE delivery."""
    
    async def event_generator():
        print("[TEST] Starting stream...")
        for i in range(3):
            data = {
                "stage": "test",
                "message": f"Test event {i+1}",
                "progress": (i+1) * 30
            }
            event = f"data: {json.dumps(data)}\n\n"
            print(f"[TEST] Yielding: {event}")
            yield event
            await asyncio.sleep(0.5)
        
        # Final complete event
        result = {
            "final_score": 75,
            "sub_scores": {"a": 80, "b": 70},
            "explanation": "Test complete",
            "recommendations": ["Test rec 1"],
            "detailed_report": "Test report"
        }
        final_event = f"data: {json.dumps({'stage': 'complete', 'message': 'Complete', 'progress': 100, 'result': result})}\n\n"
        print(f"[TEST] Yielding final: {final_event}")
        yield final_event
        print("[TEST] Stream finished")
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
