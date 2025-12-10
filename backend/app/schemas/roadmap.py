"""Roadmap request schemas."""

from pydantic import BaseModel


class RoadmapFromSummaryRequest(BaseModel):
    """Request model for generating roadmap from text summary."""
    summary: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "summary": "We want to build a mobile app for fitness tracking that helps users monitor their daily exercise routines and nutrition."
            }
        }
