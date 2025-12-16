from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Depends, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.schemas.feasibility import FeasibilityRequest, FeasibilityReport
from app.schemas.feasibility_new import StructuredFeasibilityInput
from app.pipelines.builds.feasibility_pipeline import run_feasibility_assessment
from app.pipelines.builds.feasibility_pipeline_streaming import run_feasibility_assessment_streaming
from app.pipelines.builds.feasibility_pipeline_from_document import run_feasibility_from_document
from app.pipelines.builds.feasibility_pipeline_from_document_streaming import run_feasibility_from_document_streaming
from app.pipelines.builds.feasibility_pipeline_from_summary_streaming import run_feasibility_from_summary_streaming
from app.pipelines.builds.feasibility_pipeline_new import run_feasibility_assessment as run_new_assessment, convert_state_to_report
from app.models.chat import ChatSessionState
from app.database import get_db
import logging
import tempfile
import os

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/feasibility",
    tags=["Feasibility Assessment"]
)


@router.post("/assess-structured", response_model=dict)
async def assess_structured_feasibility(
    request: StructuredFeasibilityInput,
):
    """
    Assess feasibility using structured fields (25+ parameters).
    
    Combines:
    1. ML model prediction (trained on dataset)
    2. Semantic search (relevant papers from arXiv)
    3. Unified LLM assessment (5 dimensions in single call)
    4. Detailed report generation
    
    Args:
        request: StructuredFeasibilityInput with all project fields
    
    Returns:
        Complete feasibility report with ML score, papers, and analysis
    """
    logger.info(f"Structured feasibility assessment requested for {request.project_id}")
    
    try:
        # Run the integrated LangGraph pipeline
        assessment_state = run_new_assessment(request)
        
        # Convert state to report
        report = convert_state_to_report(assessment_state)
        
        # Return as JSON-serializable dict
        return {
            "project_id": report.project_id,
            "final_score": report.final_score,
            "viability_status": report.viability_status,
            "ml_score": report.ml_score,
            "ml_confidence": report.ml_confidence,
            "dimension_scores": {
                "technical": report.technical_score,
                "resource": report.resource_score,
                "skills": report.skills_score,
                "scope": report.scope_score,
                "risk": report.risk_score,
            },
            "relevant_papers": [
                {
                    "title": p.title,
                    "summary": p.summary[:200],
                    "link": p.link,
                    "relevance_score": p.relevance_score
                }
                for p in report.relevant_papers
            ],
            "explanation": report.explanation,
            "key_risks": report.key_risks,
            "recommendations": report.recommendations,
            "detailed_report": report.detailed_report,
            "assessment_timestamp": report.assessment_timestamp,
            "assessment_model_version": report.assessment_model_version,
        }
        
    except Exception as e:
        logger.error(f"Error during structured feasibility assessment: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Assessment failed: {str(e)}"
        )


@router.post("/assess", response_model=FeasibilityReport)
async def assess_project_feasibility(
    request: FeasibilityRequest,
):
    """
    Assess the feasibility of a project based on refined summary and structured fields.
    
    Args:
        request: FeasibilityRequest containing refined_summary and project fields
        
    Returns:
        FeasibilityReport with final score, sub-scores, explanation, recommendations, and detailed report
    """
    logger.info("Feasibility assessment requested")
    
    try:
        # Run the feasibility assessment pipeline
        assessment_result = run_feasibility_assessment(
            refined_summary=request.refined_summary,
            problem_statement=request.problem_statement,
            domain=request.domain,
            goals=request.goals,
            prerequisites=request.prerequisites,
            key_topics=request.key_topics,
        )
        
        # Collect sub-scores into a dictionary
        sub_scores = {}
        if assessment_result.technical_feasibility:
            sub_scores["technical"] = assessment_result.technical_feasibility.score
        if assessment_result.resource_feasibility:
            sub_scores["resources"] = assessment_result.resource_feasibility.score
        if assessment_result.skills_feasibility:
            sub_scores["skills"] = assessment_result.skills_feasibility.score
        if assessment_result.scope_feasibility:
            sub_scores["scope"] = assessment_result.scope_feasibility.score
        if assessment_result.risk_feasibility:
            sub_scores["risk"] = assessment_result.risk_feasibility.score
        
        # Collect recommendations from each dimension
        recommendations = []
        if assessment_result.technical_feasibility and assessment_result.technical_feasibility.recommendation:
            recommendations.append(assessment_result.technical_feasibility.recommendation)
        if assessment_result.resource_feasibility and assessment_result.resource_feasibility.recommendation:
            recommendations.append(assessment_result.resource_feasibility.recommendation)
        if assessment_result.skills_feasibility and assessment_result.skills_feasibility.recommendation:
            recommendations.append(assessment_result.skills_feasibility.recommendation)
        if assessment_result.scope_feasibility and assessment_result.scope_feasibility.recommendation:
            recommendations.append(assessment_result.scope_feasibility.recommendation)
        if assessment_result.risk_feasibility and assessment_result.risk_feasibility.recommendation:
            recommendations.append(assessment_result.risk_feasibility.recommendation)
        
        # Return polished report
        return FeasibilityReport(
            final_score=assessment_result.final_score or 50,
            sub_scores=sub_scores,
            explanation=assessment_result.overall_explanation or "Assessment complete.",
            recommendations=recommendations,
            detailed_report=assessment_result.final_report or "No detailed report available.",
        )
        
    except Exception as e:
        logger.error(f"Error during feasibility assessment: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Feasibility assessment failed: {str(e)}"
        )


@router.post("/from-chat/{session_id}", response_model=FeasibilityReport)
async def assess_feasibility_from_chat(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Assess feasibility continuing from a chat session's refined summary.
    
    Args:
        session_id: The chat session ID to retrieve refined summary from
        db: Database session
        
    Returns:
        FeasibilityReport with feasibility assessment based on chat summary
    """
    logger.info(f"Feasibility assessment requested from chat session {session_id}")
    
    try:
        # Retrieve chat session state
        result = await db.execute(
            select(ChatSessionState).where(ChatSessionState.session_id == session_id)
        )
        session_state = result.scalar_one_or_none()
        
        if not session_state:
            raise HTTPException(
                status_code=404,
                detail=f"Chat session {session_id} not found or has no refined summary"
            )
        
        # Extract refined summary and structured fields from chat session
        refined_summary = session_state.refined_summary or session_state.initial_summary
        if not refined_summary:
            raise HTTPException(
                status_code=400,
                detail="No refined summary available in chat session"
            )
        
        logger.info(f"Retrieved refined summary from chat session {session_id}")
        
        # Run feasibility assessment with chat-derived data
        assessment_result = run_feasibility_assessment(
            refined_summary=refined_summary,
            problem_statement=session_state.problem_statement,
            domain=session_state.domain,
            goals=session_state.goals,
            prerequisites=session_state.prerequisites,
            key_topics=session_state.key_topics,
        )
        
        # Collect sub-scores
        sub_scores = {}
        if assessment_result.technical_feasibility:
            sub_scores["technical"] = assessment_result.technical_feasibility.score
        if assessment_result.resource_feasibility:
            sub_scores["resources"] = assessment_result.resource_feasibility.score
        if assessment_result.skills_feasibility:
            sub_scores["skills"] = assessment_result.skills_feasibility.score
        if assessment_result.scope_feasibility:
            sub_scores["scope"] = assessment_result.scope_feasibility.score
        if assessment_result.risk_feasibility:
            sub_scores["risk"] = assessment_result.risk_feasibility.score
        
        # Collect recommendations
        recommendations = []
        if assessment_result.technical_feasibility and assessment_result.technical_feasibility.recommendation:
            recommendations.append(assessment_result.technical_feasibility.recommendation)
        if assessment_result.resource_feasibility and assessment_result.resource_feasibility.recommendation:
            recommendations.append(assessment_result.resource_feasibility.recommendation)
        if assessment_result.skills_feasibility and assessment_result.skills_feasibility.recommendation:
            recommendations.append(assessment_result.skills_feasibility.recommendation)
        if assessment_result.scope_feasibility and assessment_result.scope_feasibility.recommendation:
            recommendations.append(assessment_result.scope_feasibility.recommendation)
        if assessment_result.risk_feasibility and assessment_result.risk_feasibility.recommendation:
            recommendations.append(assessment_result.risk_feasibility.recommendation)
        
        return FeasibilityReport(
            final_score=assessment_result.final_score or 50,
            sub_scores=sub_scores,
            explanation=assessment_result.overall_explanation or "Assessment complete.",
            recommendations=recommendations,
            detailed_report=assessment_result.final_report or "No detailed report available.",
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during feasibility assessment from chat: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Feasibility assessment failed: {str(e)}"
        )


@router.post("/from-chat/{session_id}/stream")
async def assess_feasibility_from_chat_stream(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Assess feasibility from chat session with real-time streaming progress.
    
    Args:
        session_id: The chat session ID to retrieve refined summary from
        db: Database session
        
    Returns:
        Server-sent events stream with assessment progress and final report
    """
    logger.info(f"Feasibility streaming assessment requested from chat session {session_id}")
    
    try:
        # Retrieve chat session state
        result = await db.execute(
            select(ChatSessionState).where(ChatSessionState.session_id == session_id)
        )
        session_state = result.scalar_one_or_none()
        
        if not session_state:
            async def error_generator():
                yield f"data: {{\"stage\": \"error\", \"message\": \"Chat session not found\"}}\n\n"
            return StreamingResponse(error_generator(), media_type="text/event-stream")
        
        refined_summary = session_state.refined_summary or session_state.initial_summary
        if not refined_summary:
            async def error_generator():
                yield f"data: {{\"stage\": \"error\", \"message\": \"No refined summary available\"}}\n\n"
            return StreamingResponse(error_generator(), media_type="text/event-stream")
        
        async def event_generator():
            try:
                logger.info(f"Starting feasibility assessment stream for session {session_id}")
                yield f"data: {{\"stage\": \"starting\", \"message\": \"Starting feasibility assessment...\"}}\n\n"
                
                # Stream feasibility assessment
                for event in run_feasibility_assessment_streaming(
                    refined_summary=refined_summary,
                    problem_statement=session_state.problem_statement,
                    domain=session_state.domain,
                    goals=session_state.goals,
                    prerequisites=session_state.prerequisites,
                    key_topics=session_state.key_topics,
                ):
                    yield event
                
                # Emit final completion
                yield f"data: {{\"stage\": \"complete\"}}\n\n"
                    
            except Exception as e:
                logger.error(f"Stream error: {str(e)}", exc_info=True)
                yield f"data: {{\"stage\": \"error\", \"message\": \"Stream error: {str(e)}\"}}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )
        
    except Exception as e:
        logger.error(f"Feasibility stream error: {str(e)}", exc_info=True)
        async def error_generator():
            yield f"data: {{\"stage\": \"error\", \"message\": \"Error: {str(e)}\"}}\n\n"
        return StreamingResponse(error_generator(), media_type="text/event-stream")


@router.post("/generate", response_model=FeasibilityReport)
async def generate_feasibility_from_file(
    file: UploadFile = File(...),
):
    """
    Upload a document and assess feasibility.
    
    Flow: scoping -> feasibility
    
    Args:
        file: Uploaded document file (PDF or DOCX)
        
    Returns:
        FeasibilityReport with feasibility assessment results
    """
    logger.info("Feasibility generation from file requested")
    
    # Check file type
    allowed_extensions = ['.pdf', '.docx']
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Please upload PDF or DOCX files only."
        )
    
    temp_file_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Run feasibility pipeline from document (scoping + feasibility)
        logger.info("Running document analysis and feasibility assessment...")
        result = run_feasibility_from_document(temp_file_path)
        
        # Clean up temporary file
        os.unlink(temp_file_path)
        
        # Collect sub-scores
        sub_scores = {}
        if result.technical_feasibility:
            sub_scores["technical"] = result.technical_feasibility.score
        if result.resource_feasibility:
            sub_scores["resources"] = result.resource_feasibility.score
        if result.skills_feasibility:
            sub_scores["skills"] = result.skills_feasibility.score
        if result.scope_feasibility:
            sub_scores["scope"] = result.scope_feasibility.score
        if result.risk_feasibility:
            sub_scores["risk"] = result.risk_feasibility.score
        
        # Collect recommendations
        recommendations = []
        if result.technical_feasibility and result.technical_feasibility.recommendation:
            recommendations.append(result.technical_feasibility.recommendation)
        if result.resource_feasibility and result.resource_feasibility.recommendation:
            recommendations.append(result.resource_feasibility.recommendation)
        if result.skills_feasibility and result.skills_feasibility.recommendation:
            recommendations.append(result.skills_feasibility.recommendation)
        if result.scope_feasibility and result.scope_feasibility.recommendation:
            recommendations.append(result.scope_feasibility.recommendation)
        if result.risk_feasibility and result.risk_feasibility.recommendation:
            recommendations.append(result.risk_feasibility.recommendation)
        
        return FeasibilityReport(
            final_score=result.final_score or 50,
            sub_scores=sub_scores,
            explanation=result.overall_explanation or "Assessment complete.",
            recommendations=recommendations,
            detailed_report=result.final_report or "No detailed report available.",
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during feasibility generation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing document: {str(e)}"
        )
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)


@router.post("/generate-stream")
async def generate_feasibility_stream(
    file: UploadFile = File(...),
):
    """
    Upload a document and assess feasibility with real-time status streaming.
    Streams assessment progress updates via Server-Sent Events.
    
    Args:
        file: Uploaded document file (PDF or DOCX)
        
    Returns:
        Server-sent events stream with assessment progress and final report
    """
    allowed_extensions = [".pdf", ".docx"]
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    temp_file_path = None
    try:
        # Save file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        async def event_generator():
            try:
                for event in run_feasibility_from_document_streaming(temp_file_path):
                    yield event
            finally:
                if temp_file_path and os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )
        
    except Exception as e:
        logger.error(f"Feasibility stream error: {str(e)}", exc_info=True)
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/assess-from-summary-stream")
async def assess_feasibility_from_summary_stream(body: dict = Body(...)):
    """
    Assess feasibility from a text summary with real-time status streaming.
    
    Args:
        body: {"summary": "text summary of project"}
        
    Returns:
        Server-sent events stream with feasibility assessment progress and results
    """
    try:
        if not body or "summary" not in body:
            raise HTTPException(status_code=400, detail="Request body must contain 'summary' field")
        
        summary = body.get("summary", "").strip() if isinstance(body.get("summary"), str) else str(body.get("summary", "")).strip()
        
        if not summary:
            raise HTTPException(status_code=400, detail="Summary text cannot be empty")
        
        async def event_generator():
            try:
                for event in run_feasibility_from_summary_streaming(summary):
                    yield event
            finally:
                pass  # No file cleanup needed for summary input
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Feasibility from summary stream error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
