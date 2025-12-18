"""Summarize research findings with text extraction."""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
import traceback
import tempfile
import os

from app.pipelines.builds.summarize_pipeline import (
    summarize_pipeline_from_file,
    summarize_pipeline_from_text
)

router = APIRouter(prefix="/summarize", tags=["summarize"])


class SummarizeRequest(BaseModel):
    """Request model for text summarization."""
    text: str


class SummarizeResponse(BaseModel):
    """Response model for summarization."""
    success: bool
    summary: str


@router.post("/text", response_model=SummarizeResponse)
async def summarize_text(request: SummarizeRequest):
    """Summarize text content directly."""
    try:
        print("\n" + "=" * 80)
        print("SUMMARIZE TEXT ENDPOINT")
        print("=" * 80)
        print(f"Received text: {len(request.text)} characters")
        print(f"Preview: {request.text[:100]}...")
        
        summary = summarize_pipeline_from_text(request.text)
        
        return SummarizeResponse(success=True, summary=summary)
    
    except Exception as e:
        print(f"\n❌ ERROR in summarize_text: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/file", response_model=SummarizeResponse)
async def summarize_file(file: UploadFile = File(...)):
    """Summarize uploaded document file (PDF or DOCX).
    
    Flow: file upload → text extraction → summarization
    """
    try:
        print("\n" + "=" * 80)
        print("SUMMARIZE FILE ENDPOINT")
        print("=" * 80)
        print(f"File: {file.filename}")
        print(f"Content-Type: {file.content_type}")
        
        # Validate file type
        allowed_types = {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
        if file.content_type not in allowed_types:
            raise ValueError(f"Unsupported file type: {file.content_type}. Supported: PDF, DOCX")
        
        # Save file temporarily
        with tempfile.NamedTemporaryFile(suffix=os.path.splitext(file.filename)[1], delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        print(f"Saved to temp: {tmp_path}")
        print(f"File size: {len(content)} bytes")
        
        try:
            # Run summarize pipeline with text extraction
            summary = summarize_pipeline_from_file(tmp_path)
            return SummarizeResponse(success=True, summary=summary)
        
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                print(f"Cleaned up temp file: {tmp_path}")
    
    except Exception as e:
        print(f"\n❌ ERROR in summarize_file: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
