from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from app.schemas.feasibility import FeasibilityRequest, FeasibilityReport
from app.pipelines.builds.feasibility_pipeline import run_feasibility_assessment
from app.pipelines.builds.feasibility_pipeline_streaming import run_feasibility_assessment_streaming
from app.pipelines.builds.roadmap_pipeline import run_roadmap_pipeline
import logging
import tempfile
import os

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/feasibility",
    tags=["Feasibility Assessment"]
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


@router.post("/generate")
async def generate_feasibility_from_file(
    file: UploadFile = File(...),
):
    """
    Upload a document, generate roadmap with summary, then assess feasibility.
    Similar to roadmap endpoint but includes feasibility assessment.
    
    Args:
        file: Uploaded document file (PDF or DOCX)
        
    Returns:
        dict: Contains roadmap output plus feasibility assessment
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
        
        # Step 1: Run roadmap pipeline to get refined summary and structured fields
        logger.info("Step 1: Running roadmap pipeline to extract summary and fields...")
        roadmap_output = run_roadmap_pipeline(temp_file_path)
        
        if roadmap_output.status != "success":
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate roadmap: {roadmap_output.message}"
            )
        
        # Step 2: Run feasibility assessment with extracted data
        logger.info("Step 2: Running feasibility assessment...")
        assessment_result = run_feasibility_assessment(
            refined_summary=roadmap_output.refined_summary or roadmap_output.initial_summary or "",
            problem_statement=None,  # Could be extracted from summary if needed
            domain=None,
            goals=None,
            prerequisites=None,
            key_topics=None,
        )
        
        # Collect feasibility sub-scores
        feasibility_scores = {}
        if assessment_result.technical_feasibility:
            feasibility_scores["technical"] = assessment_result.technical_feasibility.score
        if assessment_result.resource_feasibility:
            feasibility_scores["resources"] = assessment_result.resource_feasibility.score
        if assessment_result.skills_feasibility:
            feasibility_scores["skills"] = assessment_result.skills_feasibility.score
        if assessment_result.scope_feasibility:
            feasibility_scores["scope"] = assessment_result.scope_feasibility.score
        if assessment_result.risk_feasibility:
            feasibility_scores["risk"] = assessment_result.risk_feasibility.score
        
        # Return combined result
        return {
            "success": True,
            "roadmap": roadmap_output.roadmap,
            "initial_summary": roadmap_output.initial_summary,
            "refined_summary": roadmap_output.refined_summary,
            "feasibility_score": assessment_result.final_score or 50,
            "feasibility_sub_scores": feasibility_scores,
            "feasibility_report": assessment_result.final_report,
        }
        
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
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        async def event_generator():
            try:
                # Extract data from document via roadmap pipeline
                logger.info("Extracting document data...")
                roadmap_output = run_roadmap_pipeline(temp_file_path)
                
                if roadmap_output.status != "success":
                    yield f"data: {{\"stage\": \"error\", \"status\": \"error\", \"message\": \"Failed to extract document data\"}}\n\n"
                    return
                
                refined_summary = roadmap_output.refined_summary or roadmap_output.initial_summary or ""
                
                # Stream feasibility assessment
                for event in run_feasibility_assessment_streaming(
                    refined_summary=refined_summary,
                ):
                    yield event
                    
            except Exception as e:
                logger.error(f"Stream error: {str(e)}")
                yield f"data: {{\"stage\": \"error\", \"status\": \"error\", \"message\": \"{str(e)}\"}}\n\n"
            finally:
                if temp_file_path and os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )
        
    except HTTPException:
        raise
    except Exception as e:
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        logger.error(f"Feasibility stream error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
