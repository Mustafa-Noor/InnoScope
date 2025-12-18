"""Summarize request/response schemas."""

from pydantic import BaseModel


class SummarizeRequest(BaseModel):
    """Request model for summarizing text content."""
    text: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "Long research paper or project description to be summarized..."
            }
        }


class SummarizeResponse(BaseModel):
    """Response model for summarization."""
    success: bool
    summary: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "summary": "Concise summary of the provided text (200-300 words)..."
            }
        }
