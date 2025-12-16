"""
Feasibility assessment nodes for LangGraph pipeline.
- ML Prediction: Generate ML-based feasibility score
- Semantic Search: Find relevant papers
- Unified Assessment: Generate all 5 dimension scores using ML + papers + LLM
"""

import logging
import json
import re
from app.utils.llm import call_llm
from app.schemas.feasibility_new import (
    FeasibilityAssessmentState,
    FeasibilitySubScore,
    FeasibilityPrediction,
    RelevantPaper
)
from app.services.feasibility_predictor import get_predictor
from app.services.semantic_search import get_search_service

logger = logging.getLogger(__name__)


def ml_prediction_node(state: FeasibilityAssessmentState) -> FeasibilityAssessmentState:
    """
    Stage 1: ML Prediction
    Predict feasibility score from structured fields using trained model.
    """
    logger.info("[ML Prediction] Starting ML prediction...")
    
    try:
        predictor = get_predictor()
        prediction = predictor.predict(state.input_data)
        
        state.ml_prediction = FeasibilityPrediction(
            ml_score=prediction.ml_score,
            confidence=prediction.confidence,
            risk_indicators=prediction.risk_indicators
        )
        
        logger.info(f"[ML Prediction] Score: {prediction.ml_score:.1f}/100, "
                   f"Confidence: {prediction.confidence:.2f}")
        
    except Exception as e:
        logger.error(f"[ML Prediction] Error: {e}")
        # Fallback: use neutral score
        state.ml_prediction = FeasibilityPrediction(
            ml_score=50.0,
            confidence=0.5,
            risk_indicators=["ML prediction unavailable"]
        )
    
    return state


def semantic_search_node(state: FeasibilityAssessmentState) -> FeasibilityAssessmentState:
    """
    Stage 2: Semantic Search
    Find relevant research papers based on project details.
    """
    logger.info("[Semantic Search] Starting paper search...")
    
    try:
        search_service = get_search_service()
        papers = search_service.search_papers(state.input_data, top_k=5)
        
        state.relevant_papers = papers
        logger.info(f"[Semantic Search] Found {len(papers)} relevant papers")
        
    except Exception as e:
        logger.error(f"[Semantic Search] Error: {e}")
        state.relevant_papers = []
    
    return state


def unified_assessment_node(state: FeasibilityAssessmentState) -> FeasibilityAssessmentState:
    """
    Stage 3: Unified Assessment
    Generate all 5 feasibility dimension scores using ML prediction, papers, and LLM.
    Single LLM call to score all dimensions together for efficiency.
    """
    logger.info("[Unified Assessment] Starting 5-dimension assessment...")
    
    # Build papers context
    papers_text = ""
    if state.relevant_papers:
        papers_text = "\n\nRELEVANT RESEARCH PAPERS:\n"
        for i, paper in enumerate(state.relevant_papers[:3], 1):
            papers_text += f"{i}. {paper.title}\n"
            papers_text += f"   Summary: {paper.summary[:200]}...\n"
            papers_text += f"   Link: {paper.link}\n"
    
    # Build project context
    input_data = state.input_data
    project_context = f"""
PROJECT DETAILS:
- Domain: {input_data.product_domain}
- Application: {input_data.application_area}
- Summary: {input_data.summary or 'Not provided'}

TECHNICAL METRICS (0-5 scale):
- Problem Clarity: {input_data.problem_clarity_score}
- Technical Complexity: {input_data.technical_complexity_score}
- Technology Maturity: {input_data.technology_maturity_score}
- Data Availability: {input_data.data_availability_score}
- Infrastructure: {input_data.infrastructure_requirement_score}
- Experimental Validation: {input_data.experimental_validation_score}

VALIDATION:
- Baseline Comparison: {'Yes' if input_data.baseline_comparison_flag else 'No'}
- Real-world Testing: {'Yes' if input_data.real_world_testing_flag else 'No'}
- Limitations Discussed: {'Yes' if input_data.limitations_discussed_flag else 'No'}

RESOURCES & MARKET:
- R&D Cost: ${input_data.rd_cost_estimate:,.0f}
- Startup Cost: ${input_data.startup_cost_estimate:,.0f}
- Resource Availability: {input_data.resource_availability_score}/5
- Time to Market: {input_data.time_to_market_months} months
- Market Size: ${input_data.target_market_size:.1f}M
- Competition: {input_data.competition_level}/5
- Adoption Rate: {input_data.projected_adoption_rate*100:.1f}%
- ROI: {input_data.projected_roi*100:.1f}%

RISK & COMPLIANCE:
- Regulatory: {'Compliant' if input_data.regulatory_compliance_flag else 'Non-compliant'}
- Legal Risks: {'Identified' if input_data.legal_risk_flag else 'None'}
- Risk Level: {input_data.risk_level_score}/5

ML PREDICTION:
- Score: {state.ml_prediction.ml_score:.1f}/100
- Confidence: {state.ml_prediction.confidence:.2f}
- Risk Indicators: {', '.join(state.ml_prediction.risk_indicators) if state.ml_prediction.risk_indicators else 'None'}
{papers_text}
"""

    prompt = f"""You are a feasibility expert. Assess this project across 5 dimensions using the provided data and research insights.

{project_context}

Score EACH dimension 0-100 and provide brief explanation + recommendation.

Dimensions:
1. TECHNICAL: Can we build it with available technologies?
2. RESOURCE: Do we have budget, infrastructure, and tools?
3. SKILLS: Does the team have required expertise?
4. SCOPE: Is timeline and feature scope realistic?
5. RISK: What could go wrong and how severe?

Return JSON:
{{
  "technical_feasibility": {{"score": <0-100>, "explanation": "<brief>", "recommendation": "<brief>"}},
  "resource_feasibility": {{"score": <0-100>, "explanation": "<brief>", "recommendation": "<brief>"}},
  "skills_feasibility": {{"score": <0-100>, "explanation": "<brief>", "recommendation": "<brief>"}},
  "scope_feasibility": {{"score": <0-100>, "explanation": "<brief>", "recommendation": "<brief>"}},
  "risk_feasibility": {{"score": <0-100>, "explanation": "<brief>", "recommendation": "<brief>"}}
}}
"""

    try:
        raw_response = call_llm(prompt)
        
        # Parse JSON response
        json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            
            # Extract and set scores
            if "technical_feasibility" in data:
                d = data["technical_feasibility"]
                state.technical_feasibility = FeasibilitySubScore(
                    score=int(d.get("score", 50)),
                    explanation=str(d.get("explanation", "Assessment complete")),
                    recommendation=str(d.get("recommendation", ""))
                )
            
            if "resource_feasibility" in data:
                d = data["resource_feasibility"]
                state.resource_feasibility = FeasibilitySubScore(
                    score=int(d.get("score", 50)),
                    explanation=str(d.get("explanation", "")),
                    recommendation=str(d.get("recommendation", ""))
                )
            
            if "skills_feasibility" in data:
                d = data["skills_feasibility"]
                state.skills_feasibility = FeasibilitySubScore(
                    score=int(d.get("score", 50)),
                    explanation=str(d.get("explanation", "")),
                    recommendation=str(d.get("recommendation", ""))
                )
            
            if "scope_feasibility" in data:
                d = data["scope_feasibility"]
                state.scope_feasibility = FeasibilitySubScore(
                    score=int(d.get("score", 50)),
                    explanation=str(d.get("explanation", "")),
                    recommendation=str(d.get("recommendation", ""))
                )
            
            if "risk_feasibility" in data:
                d = data["risk_feasibility"]
                state.risk_feasibility = FeasibilitySubScore(
                    score=int(d.get("score", 50)),
                    explanation=str(d.get("explanation", "")),
                    recommendation=str(d.get("recommendation", ""))
                )
            
            logger.info("[Unified Assessment] Scores assigned successfully")
        
    except Exception as e:
        logger.error(f"[Unified Assessment] Error: {e}")
        # Fallback: use ML score for all dimensions
        fallback_score = int(state.ml_prediction.ml_score) if state.ml_prediction else 50
        for dim in ['technical', 'resource', 'skills', 'scope', 'risk']:
            attr = f"{dim}_feasibility"
            setattr(state, attr, FeasibilitySubScore(
                score=fallback_score,
                explanation="Assessment based on ML prediction",
                recommendation="Further analysis recommended"
            ))
    
    return state
