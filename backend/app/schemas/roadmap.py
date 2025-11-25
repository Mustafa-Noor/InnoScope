from pydantic import BaseModel, Field
from typing import Optional

class RoadmapPipelineInput(BaseModel):
    file_path: str = Field(..., description="Path to the research paper document")

class RoadmapPipelineOutput(BaseModel):
    status: str = Field(..., description="Result status: success, warning, or error")
    message: str = Field(..., description="Message describing the result")
    summary: Optional[str] = Field(None, description="Generated summary of the research paper")
    roadmap: Optional[str] = Field(None, description="Generated roadmap from the research paper")