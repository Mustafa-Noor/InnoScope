from pydantic import BaseModel, Field
from typing import Optional, List

class RoadmapPipelineInput(BaseModel):
    file_path: str = Field(..., description="Path to the research paper document")

class RoadmapPipelineOutput(BaseModel):
    status: str = Field(..., description="Result status: success, warning, or error")
    message: str = Field(..., description="Message describing the result")
    roadmap: Optional[str] = Field(None, description="Generated roadmap from the research paper")

class RoadmapState(BaseModel):
    raw_text: Optional[str] = None
    file_path: Optional[str] = None
    # --- Essential Project Understanding ---
    problem_statement: Optional[str] = None
    domain: Optional[str] = None
    goals: Optional[List[str]] = None
    features: Optional[List[str]] = None         # added for clarity

    # --- Core Roadmap Elements ---
    prerequisites: Optional[List[str]] = None
    key_topics: Optional[List[str]] = None
    tools_and_tech: Optional[List[str]] = None
    constraints: Optional[List[str]] = None
    challenges: Optional[List[str]] = None       # added to improve planning
    
    summary: Optional[str] = Field(None, description="Generated summary of the research paper")

    # --- Execution Planning ---
    milestones: Optional[List[str]] = None
    deliverables: Optional[List[str]] = None
    timeline: Optional[str] = None

    # --- Agent Control (for LangGraph loop) ---
    missing_fields: Optional[List[str]] = None
    last_question: Optional[str] = None

    followup_attempts: int = 0