"""
Convert legacy feasibility inputs to structured format.
Bridges old (summary-based) to new (ML-based) feasibility assessment pipeline.
"""

import logging
from typing import List, Optional
from app.schemas.feasibility_new import StructuredFeasibilityInput
from app.schemas.feasibility import FeasibilityRequest

logger = logging.getLogger(__name__)


def convert_legacy_request_to_structured(
    request: FeasibilityRequest,
    project_id: Optional[str] = None
) -> StructuredFeasibilityInput:
    """
    Convert FeasibilityRequest (legacy format) to StructuredFeasibilityInput.
    
    Args:
        request: Legacy FeasibilityRequest
        project_id: Optional project ID
    
    Returns:
        StructuredFeasibilityInput with estimated fields
    """
    logger.info("Converting legacy request to structured format")
    
    # Extract domain from request
    product_domain = request.domain or "Unknown"
    
    # Use goals/key_topics to infer application area
    application_area = "Custom Implementation"
    if request.key_topics and len(request.key_topics) > 0:
        application_area = request.key_topics[0]
    
    # Estimate scores from summary text (1-5 scale based on keywords)
    summary_text = (request.refined_summary or "").lower()
    
    # Problem clarity: check for clear problem statements
    problem_clarity_score = _estimate_clarity_score(summary_text)
    
    # Technical complexity: check for complexity keywords
    technical_complexity_score = _estimate_complexity_score(summary_text)
    
    # Technology maturity: check for mature vs experimental tech
    technology_maturity_score = _estimate_maturity_score(summary_text)
    
    # Data availability: check for data-related keywords
    data_availability_score = _estimate_data_score(summary_text)
    
    # Infrastructure requirement: check for infra keywords
    infrastructure_requirement_score = _estimate_infrastructure_score(summary_text)
    
    # Experimental validation: check for testing/validation keywords
    experimental_validation_score = _estimate_validation_score(summary_text)
    
    # Flags (assume moderate values)
    baseline_comparison_flag = 1 if "baseline" in summary_text or "comparison" in summary_text else 0
    real_world_testing_flag = 1 if "test" in summary_text or "pilot" in summary_text else 0
    limitations_discussed_flag = 1 if "limitation" in summary_text or "challenge" in summary_text else 0
    
    # Resource estimates (default moderate values)
    rd_cost_estimate = 50000.0  # Default: $50k
    startup_cost_estimate = 100000.0  # Default: $100k
    resource_availability_score = 3  # Default: moderate
    
    # Market assessment (defaults)
    time_to_market_months = 12  # Default: 1 year
    target_market_size = 100.0  # Default: $100M
    competition_level = 3  # Default: moderate
    projected_adoption_rate = 0.3  # Default: 30%
    unique_selling_proposition_score = 3  # Default: moderate
    projected_roi = 1.5  # Default: 150% ROI
    
    # Risk assessment (defaults)
    regulatory_compliance_flag = 0  # Assume not regulated unless mentioned
    legal_risk_flag = 0  # Assume no legal risk unless mentioned
    risk_level_score = _estimate_risk_score(summary_text)
    
    return StructuredFeasibilityInput(
        project_id=project_id,
        product_domain=product_domain,
        application_area=application_area,
        problem_clarity_score=problem_clarity_score,
        technical_complexity_score=technical_complexity_score,
        technology_maturity_score=technology_maturity_score,
        data_availability_score=data_availability_score,
        infrastructure_requirement_score=infrastructure_requirement_score,
        experimental_validation_score=experimental_validation_score,
        baseline_comparison_flag=baseline_comparison_flag,
        real_world_testing_flag=real_world_testing_flag,
        limitations_discussed_flag=limitations_discussed_flag,
        rd_cost_estimate=rd_cost_estimate,
        startup_cost_estimate=startup_cost_estimate,
        resource_availability_score=resource_availability_score,
        time_to_market_months=time_to_market_months,
        target_market_size=target_market_size,
        competition_level=competition_level,
        projected_adoption_rate=projected_adoption_rate,
        unique_selling_proposition_score=unique_selling_proposition_score,
        projected_roi=projected_roi,
        regulatory_compliance_flag=regulatory_compliance_flag,
        legal_risk_flag=legal_risk_flag,
        risk_level_score=risk_level_score,
        summary=request.refined_summary or request.problem_statement or "",
        key_challenges=[],
        key_opportunities=[]
    )


def convert_text_to_structured(
    summary: str,
    domain: Optional[str] = None,
    goals: Optional[List[str]] = None,
    project_id: Optional[str] = None
) -> StructuredFeasibilityInput:
    """
    Convert text summary to StructuredFeasibilityInput.
    
    Args:
        summary: Text summary of project
        domain: Project domain
        goals: Project goals
        project_id: Optional project ID
    
    Returns:
        StructuredFeasibilityInput with estimated fields
    """
    logger.info("Converting text summary to structured format")
    
    product_domain = domain or "Unknown"
    application_area = (goals[0] if goals and len(goals) > 0 else "Custom Implementation")
    
    summary_lower = summary.lower()
    
    return StructuredFeasibilityInput(
        project_id=project_id,
        product_domain=product_domain,
        application_area=application_area,
        problem_clarity_score=_estimate_clarity_score(summary_lower),
        technical_complexity_score=_estimate_complexity_score(summary_lower),
        technology_maturity_score=_estimate_maturity_score(summary_lower),
        data_availability_score=_estimate_data_score(summary_lower),
        infrastructure_requirement_score=_estimate_infrastructure_score(summary_lower),
        experimental_validation_score=_estimate_validation_score(summary_lower),
        baseline_comparison_flag=1 if "baseline" in summary_lower or "comparison" in summary_lower else 0,
        real_world_testing_flag=1 if "test" in summary_lower or "pilot" in summary_lower else 0,
        limitations_discussed_flag=1 if "limitation" in summary_lower or "challenge" in summary_lower else 0,
        rd_cost_estimate=50000.0,
        startup_cost_estimate=100000.0,
        resource_availability_score=3,
        time_to_market_months=12,
        target_market_size=100.0,
        competition_level=3,
        projected_adoption_rate=0.3,
        unique_selling_proposition_score=3,
        projected_roi=1.5,
        regulatory_compliance_flag=0,
        legal_risk_flag=0,
        risk_level_score=_estimate_risk_score(summary_lower),
        summary=summary,
        key_challenges=[],
        key_opportunities=[]
    )


# Scoring estimation functions

def _estimate_clarity_score(text: str) -> int:
    """Estimate problem clarity from text (1-5)."""
    clarity_keywords = ["clear", "defined", "specific", "objective", "goal", "well-defined"]
    ambiguity_keywords = ["unclear", "vague", "ambiguous", "undefined", "uncertain"]
    
    clarity_count = sum(1 for keyword in clarity_keywords if keyword in text)
    ambiguity_count = sum(1 for keyword in ambiguity_keywords if keyword in text)
    
    base_score = 3
    score = base_score + clarity_count - ambiguity_count
    return max(1, min(5, score))


def _estimate_complexity_score(text: str) -> int:
    """Estimate technical complexity from text (1-5)."""
    complex_keywords = ["complex", "difficult", "sophisticated", "advanced", "challenging", "intricate"]
    simple_keywords = ["simple", "straightforward", "basic", "easy", "elementary"]
    
    complex_count = sum(1 for keyword in complex_keywords if keyword in text)
    simple_count = sum(1 for keyword in simple_keywords if keyword in text)
    
    base_score = 3
    score = base_score + complex_count - simple_count
    return max(1, min(5, score))


def _estimate_maturity_score(text: str) -> int:
    """Estimate technology maturity from text (1-5)."""
    mature_keywords = ["established", "mature", "proven", "stable", "production", "industry-standard"]
    emerging_keywords = ["new", "emerging", "experimental", "novel", "bleeding-edge", "research"]
    
    mature_count = sum(1 for keyword in mature_keywords if keyword in text)
    emerging_count = sum(1 for keyword in emerging_keywords if keyword in text)
    
    base_score = 3
    score = base_score + mature_count - emerging_count
    return max(1, min(5, score))


def _estimate_data_score(text: str) -> int:
    """Estimate data availability from text (1-5)."""
    available_keywords = ["available", "existing", "dataset", "database", "accessible", "collected"]
    unavailable_keywords = ["missing", "unavailable", "scarce", "limited data", "no data"]
    
    available_count = sum(1 for keyword in available_keywords if keyword in text)
    unavailable_count = sum(1 for keyword in unavailable_keywords if keyword in text)
    
    base_score = 3
    score = base_score + available_count - unavailable_count
    return max(1, min(5, score))


def _estimate_infrastructure_score(text: str) -> int:
    """Estimate infrastructure requirements from text (1-5)."""
    heavy_keywords = ["server", "cloud", "infrastructure", "hardware", "deployment", "scalable", "distributed"]
    light_keywords = ["lightweight", "minimal", "simple deployment", "low-cost", "edge"]
    
    heavy_count = sum(1 for keyword in heavy_keywords if keyword in text)
    light_count = sum(1 for keyword in light_keywords if keyword in text)
    
    base_score = 3
    score = base_score + (heavy_count - light_count) // 2
    return max(1, min(5, score))


def _estimate_validation_score(text: str) -> int:
    """Estimate experimental validation from text (1-5)."""
    validation_keywords = ["validated", "tested", "verified", "evaluation", "experiment", "benchmark"]
    no_validation_keywords = ["not validated", "untested", "unverified", "preliminary"]
    
    validation_count = sum(1 for keyword in validation_keywords if keyword in text)
    no_validation_count = sum(1 for keyword in no_validation_keywords if keyword in text)
    
    base_score = 3
    score = base_score + validation_count - no_validation_count
    return max(1, min(5, score))


def _estimate_risk_score(text: str) -> int:
    """Estimate risk level from text (1-5, where 5 = high risk)."""
    high_risk_keywords = ["risk", "challenge", "difficult", "uncertain", "unknown", "failure", "issue", "problem"]
    low_risk_keywords = ["safe", "proven", "reliable", "stable", "mature", "secure"]
    
    high_risk_count = sum(1 for keyword in high_risk_keywords if keyword in text)
    low_risk_count = sum(1 for keyword in low_risk_keywords if keyword in text)
    
    base_score = 3
    score = base_score + (high_risk_count - low_risk_count) // 2
    return max(1, min(5, score))
