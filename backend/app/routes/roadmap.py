from fastapi import APIRouter, HTTPException, Depends, Query, Body
from app.pipelines.builds.roadmap_pipeline import run_roadmap_pipeline
from app.pipelines.builds.roadmap_pipeline_from_chat import run_roadmap_from_chat
from app.pipelines.builds.roadmap_pipeline_streaming import run_roadmap_pipeline_streaming
from app.pipelines.builds.roadmap_pipeline_from_summary_streaming import run_roadmap_from_summary_streaming
from app.schemas.roadmap import RoadmapFromSummaryRequest
from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.chat import ChatSessionState
from app.database import get_db
import tempfile
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/roadmap",
   tags=["roadmap"]
)


@router.post("/generate")
async def generate_roadmap(file: UploadFile = File(...)):
    """
    Upload a document and generate a roadmap from it.
    
    Args:
        file: Uploaded document file (PDF or DOCX)
        
    Returns:
        dict: Contains status, message, initial_summary, refined_summary, and roadmap
    """
    # Check file type
    allowed_extensions = ['.pdf', '.docx']
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Please upload PDF or DOCX files only."
        )
    
    # Create temporary file
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            # Write uploaded file content to temporary file
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Run the unified roadmap pipeline (scoping + research + roadmap)
        output = run_roadmap_pipeline(temp_file_path)
        
        # Clean up temporary file
        os.unlink(temp_file_path)
        
        # Return the result
        if output.status == "success":
            return {
                "success": True,
                "message": output.message,
                "initial_summary": output.initial_summary,
                "refined_summary": output.refined_summary,
                "roadmap": output.roadmap,
            }
        elif output.status == "warning":
            return {
                "success": False,
                "message": output.message,
                "initial_summary": output.initial_summary,
                "refined_summary": output.refined_summary,
                "roadmap": output.roadmap,
            }
        else:
            raise HTTPException(status_code=500, detail=output.message)
            
    except Exception as e:
        # Clean up temp file if it exists
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")


@router.post("/from-chat/{session_id}")
async def generate_roadmap_from_chat(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate roadmap from a chat session's refined summary.
    
    Flow: chat_agent -> research -> roadmap
    
    Args:
        session_id: The chat session ID
        db: Database session
        
    Returns:
        dict: Contains roadmap, refined_summary, and status
    """
    logger.info(f"Roadmap generation from chat session {session_id}")
    
    try:
        # Retrieve chat session state
        result = await db.execute(
            select(ChatSessionState).where(ChatSessionState.session_id == session_id)
        )
        session_state = result.scalar_one_or_none()
        
        if not session_state:
            raise HTTPException(
                status_code=404,
                detail=f"Chat session {session_id} not found"
            )
        
        # Get chat memory/context
        memory_text = session_state.memory or ""
        
        # Run roadmap pipeline from chat
        result = run_roadmap_from_chat(memory_text=memory_text)
        
        return {
            "success": True,
            "message": "Roadmap generated from chat",
            "refined_summary": result.summary,
            "roadmap": result.roadmap,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating roadmap from chat: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating roadmap: {str(e)}"
        )


@router.post('/generate-stream')
async def generate_roadmap_stream(file: UploadFile = File(...)):
    """Upload a document and generate a roadmap with real-time status streaming."""
    allowed_extensions = [".pdf", ".docx"]
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    temp_file_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        async def event_generator():
            try:
                for event in run_roadmap_pipeline_streaming(temp_file_path):
                    yield event
            finally:
                if temp_file_path and os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )
    except Exception as e:
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/generate-from-summary-stream")
async def generate_roadmap_from_summary_stream(request: RoadmapFromSummaryRequest = Body(...)):
    """
    Generate roadmap from a text summary with real-time status streaming.
    
    Args:
        request: RoadmapFromSummaryRequest containing the project summary
        
    Returns:
        Server-sent events stream with roadmap generation progress and final roadmap
    """
    try:
        if not request or not hasattr(request, 'summary'):
            raise HTTPException(status_code=400, detail="Request body must contain 'summary' field")
        
        summary = request.summary.strip() if isinstance(request.summary, str) else str(request.summary).strip()
        
        if not summary:
            raise HTTPException(status_code=400, detail="Summary text cannot be empty")
        
        async def event_generator():
            try:
                for event in run_roadmap_from_summary_streaming(summary):
                    yield event
            finally:
                pass  # No file cleanup needed for summary input
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Roadmap from summary stream error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
