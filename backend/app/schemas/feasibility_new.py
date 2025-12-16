from pydantic import BaseModel, Field
from typing import Optional, List
import uuid


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class StructuredFeasibilityInput(BaseModel):
    """Structured input for feasibility assessment with all required fields."""
    
    # Project Identification
    project_id: Optional[str] = Field(
        default_factory=lambda: str(uuid.uuid4()), 
        description="Unique identifier for the project."
    )
    product_domain: str = Field(..., description="Domain of the project, e.g., Healthcare, Finance")
    application_area: str = Field(..., description="Specific application area, e.g., Disease Prediction")
    
    # Technical Assessment (0-5 scale)
    problem_clarity_score: int = Field(..., ge=0, le=5)
    technical_complexity_score: int = Field(..., ge=0, le=5)
    technology_maturity_score: int = Field(..., ge=0, le=5)
    data_availability_score: int = Field(..., ge=0, le=5)
    infrastructure_requirement_score: int = Field(..., ge=0, le=5)
    experimental_validation_score: int = Field(..., ge=0, le=5)
    
    # Validation Flags (0-1)
    baseline_comparison_flag: int = Field(..., ge=0, le=1)
    real_world_testing_flag: int = Field(..., ge=0, le=1)
    limitations_discussed_flag: int = Field(..., ge=0, le=1)
    
    # Resource & Cost Assessment
    rd_cost_estimate: float = Field(..., ge=0, description="R&D cost in USD")
    startup_cost_estimate: float = Field(..., ge=0, description="Startup cost in USD")
    resource_availability_score: int = Field(..., ge=0, le=5)
    
    # Market & Timeline Assessment
    time_to_market_months: int = Field(..., ge=0)
    target_market_size: float = Field(..., ge=0, description="Market size in millions USD")
    competition_level: int = Field(..., ge=0, le=5)
    projected_adoption_rate: float = Field(..., ge=0.0, le=1.0)
    unique_selling_proposition_score: int = Field(..., ge=0, le=5)
    projected_roi: float = Field(..., ge=0.0)
    
    # Risk & Regulatory Assessment
    regulatory_compliance_flag: int = Field(..., ge=0, le=1)
    legal_risk_flag: int = Field(..., ge=0, le=1)
    risk_level_score: int = Field(..., ge=0, le=5)
    
    # Optional text fields
    summary: Optional[str] = Field(None, description="Project summary for LLM context")
    key_challenges: Optional[List[str]] = Field(None)
    key_opportunities: Optional[List[str]] = Field(None)


# ============================================================================
# INTERNAL DATA MODELS
# ============================================================================

class FeasibilitySubScore(BaseModel):
    """Score for a feasibility dimension."""
    score: int = Field(..., ge=0, le=100)
    explanation: str = Field(...)
    recommendation: Optional[str] = None


class RelevantPaper(BaseModel):
    """Research paper from Qdrant."""
    title: str
    summary: str
    link: str
    relevance_score: float = Field(..., ge=0, le=1)


class FeasibilityPrediction(BaseModel):
    """Result from ML model prediction."""
    ml_score: float = Field(..., ge=0, le=100)
    confidence: float = Field(..., ge=0, le=1)
    risk_indicators: List[str] = Field(default_factory=list)


# ============================================================================
# LANGGRAPH STATE
# ============================================================================

class FeasibilityAssessmentState(BaseModel):
    """LangGraph state for feasibility assessment pipeline."""
    
    # Input
    input_data: StructuredFeasibilityInput
    
    # ML Prediction Stage
    ml_prediction: Optional[FeasibilityPrediction] = None
    
    # Semantic Search Stage
    relevant_papers: List[RelevantPaper] = Field(default_factory=list)
    
    # Unified Assessment Stage (all 5 dimensions scored in one LLM call)
    technical_feasibility: Optional[FeasibilitySubScore] = None
    resource_feasibility: Optional[FeasibilitySubScore] = None
    skills_feasibility: Optional[FeasibilitySubScore] = None
    scope_feasibility: Optional[FeasibilitySubScore] = None
    risk_feasibility: Optional[FeasibilitySubScore] = None
    
    # Report Generation Stage
    final_score: Optional[int] = Field(None, ge=0, le=100)
    viability_status: Optional[str] = None
    explanation: Optional[str] = None
    key_risks: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    detailed_report: Optional[str] = None


# ============================================================================
# RESPONSE SCHEMA
# ============================================================================

class FeasibilityReport(BaseModel):
    """Complete feasibility assessment report."""
    project_id: str
    final_score: int = Field(..., ge=0, le=100)
    viability_status: str  # "Highly Feasible", "Feasible", "Low Feasibility", "Not Feasible"
    
    # ML Component
    ml_score: float = Field(..., ge=0, le=100)
    ml_confidence: float = Field(..., ge=0, le=1)
    
    # Dimension Scores
    technical_score: int
    resource_score: int
    skills_score: int
    scope_score: int
    risk_score: int
    
    # Relevant Research
    relevant_papers: List[RelevantPaper] = Field(default_factory=list)
    
    # Analysis
    explanation: str
    key_risks: List[str]
    recommendations: List[str]
    detailed_report: str
    
    # Metadata
    assessment_timestamp: Optional[str] = None
    assessment_model_version: str = "2.0"
