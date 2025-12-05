from fastapi import APIRouter, HTTPException
from app.pipelines.builds.roadmap_pipeline import run_roadmap_pipeline
from fastapi import UploadFile, File
import tempfile
import os
from fastapi.responses import StreamingResponse
from app.pipelines.builds.roadmap_pipeline_streaming import run_roadmap_pipeline_streaming

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
