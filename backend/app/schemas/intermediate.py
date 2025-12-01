from pydantic import BaseModel, Field


from typing import Optional, List



class RoadmapPipelineInput(BaseModel):


    file_path: str = Field(..., description="Path to the research paper document")



class RoadmapPipelineOutput(BaseModel):


    status: str = Field(..., description="Result status: success, warning, or error")


    message: str = Field(..., description="Message describing the result")


    roadmap: Optional[str] = Field(None, description="Generated roadmap from the research paper")


class IntermediateState(BaseModel):

    # Minimal operational context

    raw_text: Optional[str] = None

    file_path: Optional[str] = None

    is_research_like: Optional[bool] = None


    # Required research fields

    problem_statement: Optional[str] = None

    domain: Optional[str] = None

    goals: Optional[List[str]] = None

    prerequisites: Optional[List[str]] = None

    key_topics: Optional[List[str]] = None


    # Generated summary (final output)

    summary: Optional[str] = Field(None, description="Generated summary of the research paper")



