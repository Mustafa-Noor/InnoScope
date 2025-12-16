from pydantic import BaseModel, Field
from typing import Optional, List


class FeasibilitySubScore(BaseModel):
    """Individual feasibility dimension score with explanation."""
    score: int = Field(..., ge=0, le=100, description="Score 0-100 for this dimension")
    explanation: str = Field(..., description="Detailed explanation for this score")
    recommendation: Optional[str] = Field(None, description="Actionable recommendation")


class FeasibilityAssessmentState(BaseModel):
    """State maintained during feasibility assessment pipeline."""
    # Input fields
    refined_summary: Optional[str] = None
    problem_statement: Optional[str] = None
    domain: Optional[str] = None
    goals: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None
    key_topics: Optional[List[str]] = None

    # Sub-assessment scores
    technical_feasibility: Optional[FeasibilitySubScore] = None
    resource_feasibility: Optional[FeasibilitySubScore] = None
    skills_feasibility: Optional[FeasibilitySubScore] = None
    scope_feasibility: Optional[FeasibilitySubScore] = None
    risk_feasibility: Optional[FeasibilitySubScore] = None

    # Final output
    final_score: Optional[int] = Field(None, ge=0, le=100, description="Final overall score 0-100")
    overall_explanation: Optional[str] = None
    final_report: Optional[str] = None


class FeasibilityReport(BaseModel):
    """Polished final feasibility report."""
    final_score: int = Field(..., ge=0, le=100, description="Overall feasibility score 0-100")
    sub_scores: dict = Field(..., description="Dictionary of sub-scores (technical, resource, skills, scope, risk)")
    explanation: str = Field(..., description="Overall explanation and rationale")
    recommendations: List[str] = Field(default_factory=list, description="Actionable recommendations")
    detailed_report: str = Field(..., description="Full formatted report with all sections")


class FeasibilityRequest(BaseModel):
    """Request to assess feasibility of a project."""
    refined_summary: str = Field(..., description="Refined summary from chat agent")
    problem_statement: Optional[str] = None
    domain: Optional[str] = None
    goals: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None
    key_topics: Optional[List[str]] = None





