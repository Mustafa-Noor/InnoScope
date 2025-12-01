from pydantic import BaseModel, Field
from typing import Optional, List
# IMPORTANT: Use the same IntermediateState definition as the refined summary pipeline
# to avoid pydantic model type mismatch errors.
from app.schemas.intermediate import IntermediateState


class ResearchState(BaseModel):
    intermediate: IntermediateState = Field(...)

    # Outputs from research agent
    wiki_summary: Optional[str] = None
    ddg_results: Optional[List[str]] = None    # list of top results or snippets
    llm_research_report: Optional[str] = None  # stitched analysis from LLM

    # Final combined research package for roadmap agent
    consolidated_research: Optional[str] = None





