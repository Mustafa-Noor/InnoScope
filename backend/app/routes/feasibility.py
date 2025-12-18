from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Depends, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.schemas.feasibility import FeasibilityRequest, FeasibilityReport
from app.schemas.feasibility_new import StructuredFeasibilityInput
from app.pipelines.builds.feasibility_pipeline_new import run_feasibility_assessment as run_new_assessment, convert_state_to_report
from app.utils.feasibility_converter import convert_legacy_request_to_structured, convert_text_to_structured
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


# @router.post("/assess", response_model=dict)
# async def assess_structured_feasibility(
#     request: StructuredFeasibilityInput,
# ):
#     """
#     Assess feasibility using structured fields (25+ parameters).
    
#     Combines:
#     1. ML model prediction (trained on dataset)
#     2. Semantic search (relevant papers from arXiv)
#     3. Unified LLM assessment (5 dimensions in single call)
#     4. Detailed report generation
    
#     Args:
#         request: StructuredFeasibilityInput with all project fields
    
#     Returns:
#         Complete feasibility report with ML score, papers, and analysis
#     """
#     logger.info(f"Structured feasibility assessment requested for {request.project_id}")
    
#     try:
#         # Run the integrated LangGraph pipeline
#         assessment_state = run_new_assessment(request)
        
#         # Convert state to report
#         report = convert_state_to_report(assessment_state)
        
#         # Return as JSON-serializable dict
#         return {
#             "project_id": report.project_id,
#             "final_score": report.final_score,
#             "viability_status": report.viability_status,
#             "ml_score": report.ml_score,
#             "ml_confidence": report.ml_confidence,
#             "dimension_scores": {
#                 "technical": report.technical_score,
#                 "resource": report.resource_score,
#                 "skills": report.skills_score,
#                 "scope": report.scope_score,
#                 "risk": report.risk_score,
#             },
#             "relevant_papers": [
#                 {
#                     "title": p.title,
#                     "summary": p.summary[:200],
#                     "link": p.link,
#                     "relevance_score": p.relevance_score
#                 }
#                 for p in report.relevant_papers
#             ],
#             "explanation": report.explanation,
#             "key_risks": report.key_risks,
#             "recommendations": report.recommendations,
#             "detailed_report": report.detailed_report,
#             "assessment_timestamp": report.assessment_timestamp,
#             "assessment_model_version": report.assessment_model_version,
#         }
        
#     except Exception as e:
#         logger.error(f"Error during structured feasibility assessment: {str(e)}", exc_info=True)
#         raise HTTPException(
#             status_code=500,
#             detail=f"Assessment failed: {str(e)}"
#         )


# @router.post("/assess-structured", response_model=dict)
# async def assess_structured_feasibility_deprecated(
#     request: StructuredFeasibilityInput,
# ):
#     """
#     DEPRECATED: Use /assess instead.
#     This endpoint is kept for backward compatibility.
#     """
#     logger.warning("Deprecated endpoint /assess-structured called. Use /assess instead.")
#     return await assess_structured_feasibility(request)


# @router.post("/from-chat/{session_id}", response_model=dict)
# async def assess_feasibility_from_chat(
#     session_id: int,
#     db: AsyncSession = Depends(get_db),
# ):
#     """
#     Assess feasibility from a chat session's refined summary.
#     Now uses new ML-based structured pipeline.
    
#     Args:
#         session_id: The chat session ID to retrieve refined summary from
#         db: Database session
        
#     Returns:
#         Feasibility report with ML score, papers, and analysis
#     """
#     logger.info(f"Feasibility assessment requested from chat session {session_id}")
    
#     try:
#         # Retrieve chat session state
#         result = await db.execute(
#             select(ChatSessionState).where(ChatSessionState.session_id == session_id)
#         )
#         session_state = result.scalar_one_or_none()
        
#         if not session_state:
#             raise HTTPException(
#                 status_code=404,
#                 detail=f"Chat session {session_id} not found"
#             )
        
#         # Extract refined summary from chat session
#         refined_summary = session_state.refined_summary or session_state.initial_summary
#         if not refined_summary:
#             raise HTTPException(
#                 status_code=400,
#                 detail="No refined summary available in chat session"
#             )
        
#         logger.info(f"Retrieved refined summary from chat session {session_id}")
        
#         # Convert text to structured format
#         structured_input = convert_text_to_structured(
#             summary=refined_summary,
#             domain=session_state.domain,
#             goals=session_state.goals if hasattr(session_state, 'goals') else None,
#             project_id=f"chat_{session_id}"
#         )
        
#         # Run new assessment pipeline
#         assessment_state = run_new_assessment(structured_input)
#         report = convert_state_to_report(assessment_state)
        
#         return {
#             "project_id": report.project_id,
#             "final_score": report.final_score,
#             "viability_status": report.viability_status,
#             "ml_score": report.ml_score,
#             "ml_confidence": report.ml_confidence,
#             "dimension_scores": {
#                 "technical": report.technical_score,
#                 "resource": report.resource_score,
#                 "skills": report.skills_score,
#                 "scope": report.scope_score,
#                 "risk": report.risk_score,
#             },
#             "relevant_papers": [
#                 {
#                     "title": p.title,
#                     "summary": p.summary[:200],
#                     "link": p.link,
#                     "relevance_score": p.relevance_score
#                 }
#                 for p in report.relevant_papers
#             ],
#             "explanation": report.explanation,
#             "key_risks": report.key_risks,
#             "recommendations": report.recommendations,
#             "detailed_report": report.detailed_report,
#         }
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error during feasibility assessment from chat: {str(e)}", exc_info=True)
#         raise HTTPException(
#             status_code=500,
#             detail=f"Feasibility assessment failed: {str(e)}"
#         )


@router.post("/from-chat/{session_id}/stream")
async def assess_feasibility_from_chat_stream(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Assess feasibility from chat session with real-time progress updates.
    Now uses new ML-based structured pipeline.
    
    Args:
        session_id: The chat session ID
        db: Database session
        
    Returns:
        Server-sent events stream with assessment progress
    """
    print("\n" + "=" * 80)
    print("FEASIBILITY ASSESSMENT FROM CHAT SESSION - STREAMING")
    print("=" * 80)
    print(f"Session ID: {session_id}")
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
            print(f"✗ No refined summary available")
            async def error_generator():
                yield f"data: {{\"stage\": \"error\", \"message\": \"No refined summary available\"}}\n\n"
            return StreamingResponse(error_generator(), media_type="text/event-stream")
        
        print(f"Domain: {session_state.domain}")
        print(f"Summary: {refined_summary[:100]}...")
        print("\n" + "-" * 80)
        print("Running assessment pipeline...")
        print("-" * 80)
        
        async def event_generator():
            try:
                logger.info(f"Starting feasibility assessment stream for session {session_id}")
                
                # Convert to structured format
                print("\nConverting text to structured format...")
                structured_input = convert_text_to_structured(
                    summary=refined_summary,
                    domain=session_state.domain,
                    goals=session_state.goals if hasattr(session_state, 'goals') else None,
                    project_id=f"chat_{session_id}"
                )
                print(f"✓ Structured input created (Project ID: {structured_input.project_id})")
                
                # Stream stages
                print("\nStreaming stages:")
                yield f"event: status\ndata: {{\"message\": \"Starting feasibility assessment...\"}}\n\n"
                print("  • Starting feasibility assessment...")
                
                yield f"event: status\ndata: {{\"message\": \"Running ML prediction...\"}}\n\n"
                print("  • Running ML prediction...")
                
                yield f"event: status\ndata: {{\"message\": \"Searching for relevant papers...\"}}\n\n"
                print("  • Searching for relevant papers...")
                
                yield f"event: status\ndata: {{\"message\": \"Assessing 5 dimensions...\"}}\n\n"
                print("  • Assessing 5 dimensions...")
                
                # Run assessment
                print("\nRunning assessment pipeline...")
                assessment_state = run_new_assessment(structured_input)
                report = convert_state_to_report(assessment_state)
                
                yield f"event: status\ndata: {{\"message\": \"Generating report...\"}}\n\n"
                print("  • Generating report...")
                
                # Print detailed results
                print("\n" + "-" * 80)
                print("RESULTS")
                print("-" * 80)
                print(f"✓ Assessment Complete!")
                print(f"  Final Score: {report.final_score}/100")
                print(f"  Status: {report.viability_status}")
                print(f"  ML Score: {report.ml_score:.1f}/100 (Confidence: {report.ml_confidence:.0%})")
                
                print("\nDimension Scores:")
                print(f"  Technical:  {report.technical_score}/100")
                print(f"  Resource:   {report.resource_score}/100")
                print(f"  Skills:     {report.skills_score}/100")
                print(f"  Scope:      {report.scope_score}/100")
                print(f"  Risk:       {report.risk_score}/100")
                
                if report.relevant_papers:
                    print(f"\nRelevant Papers ({len(report.relevant_papers)} found):")
                    for i, paper in enumerate(report.relevant_papers[:3], 1):
                        print(f"  {i}. {paper.title[:60]}...")
                        print(f"     Relevance: {paper.relevance_score:.2f}")
                
                if report.key_risks:
                    print("\nKey Risks:")
                    for i, risk in enumerate(report.key_risks, 1):
                        print(f"  {i}. {risk}")
                
                if report.recommendations:
                    print("\nRecommendations:")
                    for i, rec in enumerate(report.recommendations, 1):
                        print(f"  {i}. {rec}")
                
                print("\n" + "=" * 80)
                print("ASSESSMENT COMPLETE ✓")
                print("=" * 80 + "\n")
                
                # Send final result
                import json
                result_data = {
                    "final_score": report.final_score,
                    "viability_status": report.viability_status,
                    "ml_score": report.ml_score,
                    "ml_confidence": report.ml_confidence,
                    "technical_score": report.technical_score,
                    "resource_score": report.resource_score,
                    "skills_score": report.skills_score,
                    "scope_score": report.scope_score,
                    "risk_score": report.risk_score,
                    "relevant_papers": [{
                        "title": p.title,
                        "summary": p.summary[:200] if len(p.summary) > 200 else p.summary,
                        "link": p.link,
                        "relevance_score": p.relevance_score
                    } for p in report.relevant_papers],
                    "explanation": report.explanation,
                    "key_risks": report.key_risks,
                    "recommendations": report.recommendations,
                    "detailed_report": report.detailed_report,
                    "assessment_timestamp": report.assessment_timestamp,
                }
                yield f"event: complete\ndata: {json.dumps(result_data)}\n\n"
                    
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


# @router.post("/generate", response_model=dict)
# async def generate_feasibility_from_file(
#     file: UploadFile = File(...),
# ):
#     """
#     Upload a document and assess feasibility using new ML-based pipeline.
    
#     Flow: document parsing → scoping → structured assessment
    
#     Args:
#         file: Uploaded document file (PDF or DOCX)
        
#     Returns:
#         Feasibility report with ML score, papers, and analysis
#     """
#     logger.info("Feasibility generation from file requested")
    
#     # Check file type
#     allowed_extensions = ['.pdf', '.docx']
#     file_extension = os.path.splitext(file.filename)[1].lower()
    
#     if file_extension not in allowed_extensions:
#         raise HTTPException(
#             status_code=400, 
#             detail=f"Unsupported file type. Please upload PDF or DOCX files only."
#         )
    
#     temp_file_path = None
#     try:
#         with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
#             content = await file.read()
#             temp_file.write(content)
#             temp_file_path = temp_file.name
        
#         logger.info("Running document analysis...")
        
#         # For now, use a placeholder extraction (in real implementation, parse PDF/DOCX)
#         # Extract text from document and create structured assessment
#         summary = f"Document analysis of {file.filename}"
#         domain = "Document-Based Project"
        
#         # Convert to structured format
#         structured_input = convert_text_to_structured(
#             summary=summary,
#             domain=domain,
#             project_id=f"doc_{file.filename}"
#         )
        
#         # Run new assessment pipeline
#         assessment_state = run_new_assessment(structured_input)
#         report = convert_state_to_report(assessment_state)
        
#         # Clean up temporary file
#         os.unlink(temp_file_path)
        
#         return {
#             "project_id": report.project_id,
#             "final_score": report.final_score,
#             "viability_status": report.viability_status,
#             "ml_score": report.ml_score,
#             "ml_confidence": report.ml_confidence,
#             "dimension_scores": {
#                 "technical": report.technical_score,
#                 "resource": report.resource_score,
#                 "skills": report.skills_score,
#                 "scope": report.scope_score,
#                 "risk": report.risk_score,
#             },
#             "relevant_papers": [
#                 {
#                     "title": p.title,
#                     "summary": p.summary[:200],
#                     "link": p.link,
#                     "relevance_score": p.relevance_score
#                 }
#                 for p in report.relevant_papers
#             ],
#             "explanation": report.explanation,
#             "key_risks": report.key_risks,
#             "recommendations": report.recommendations,
#             "detailed_report": report.detailed_report,
#         }
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error during feasibility generation: {str(e)}", exc_info=True)
#         raise HTTPException(
#             status_code=500,
#             detail=f"Error processing document: {str(e)}"
#         )
#     finally:
#         if temp_file_path and os.path.exists(temp_file_path):
#             os.unlink(temp_file_path)


@router.post("/generate-stream")
async def generate_feasibility_stream(
    file: UploadFile = File(...),
):
    """
    Upload a document and assess feasibility with real-time streaming.
    Now uses new ML-based structured pipeline with progress updates.
    
    Args:
        file: Uploaded document file (PDF or DOCX)
        
    Returns:
        Server-sent events stream with assessment progress
    """
    print("\n" + "=" * 80)
    print("FEASIBILITY ASSESSMENT FROM DOCUMENT - STREAMING")
    print("=" * 80)
    print(f"File: {file.filename}")
    
    allowed_extensions = [".pdf", ".docx"]
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    if file_extension not in allowed_extensions:
        print(f"✗ Unsupported file type: {file_extension}")
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
                print("\n" + "-" * 80)
                print("Running assessment pipeline...")
                print("-" * 80)
                
                print("\nStreaming stages:")
                yield f"event: status\ndata: {{\"message\": \"Parsing document...\"}}\n\n"
                print("  • Parsing document...")
                
                yield f"event: status\ndata: {{\"message\": \"Analyzing content...\"}}\n\n"
                print("  • Analyzing content...")
                
                # Convert document to structured format
                print("\nConverting to structured format...")
                structured_input = convert_text_to_structured(
                    summary=f"Document: {file.filename}",
                    domain="Document-Based Project",
                    project_id=f"doc_{file.filename}"
                )
                print(f"✓ Structured input created (Project ID: {structured_input.project_id})")
                
                yield f"event: status\ndata: {{\"message\": \"Running ML prediction...\"}}\n\n"
                print("  • Running ML prediction...")
                
                yield f"event: status\ndata: {{\"message\": \"Searching for papers...\"}}\n\n"
                print("  • Searching for papers...")
                
                yield f"event: status\ndata: {{\"message\": \"Assessing feasibility...\"}}\n\n"
                print("  • Assessing feasibility...")
                
                # Run assessment
                print("\nRunning assessment pipeline...")
                assessment_state = run_new_assessment(structured_input)
                report = convert_state_to_report(assessment_state)
                
                # Print detailed results
                print("\n" + "-" * 80)
                print("RESULTS")
                print("-" * 80)
                print(f"✓ Assessment Complete!")
                print(f"  Final Score: {report.final_score}/100")
                print(f"  Status: {report.viability_status}")
                print(f"  ML Score: {report.ml_score:.1f}/100 (Confidence: {report.ml_confidence:.0%})")
                
                print("\nDimension Scores:")
                print(f"  Technical:  {report.technical_score}/100")
                print(f"  Resource:   {report.resource_score}/100")
                print(f"  Skills:     {report.skills_score}/100")
                print(f"  Scope:      {report.scope_score}/100")
                print(f"  Risk:       {report.risk_score}/100")
                
                if report.relevant_papers:
                    print(f"\nRelevant Papers ({len(report.relevant_papers)} found):")
                    for i, paper in enumerate(report.relevant_papers[:3], 1):
                        print(f"  {i}. {paper.title[:60]}...")
                        print(f"     Relevance: {paper.relevance_score:.2f}")
                
                print("\n" + "=" * 80)
                print("ASSESSMENT COMPLETE ✓")
                print("=" * 80 + "\n")
                
                # Send final result
                import json
                result_data = {
                    "final_score": report.final_score,
                    "viability_status": report.viability_status,
                    "ml_score": report.ml_score,
                    "ml_confidence": report.ml_confidence,
                    "technical_score": report.technical_score,
                    "resource_score": report.resource_score,
                    "skills_score": report.skills_score,
                    "scope_score": report.scope_score,
                    "risk_score": report.risk_score,
                    "relevant_papers": [{
                        "title": p.title,
                        "summary": p.summary[:200] if len(p.summary) > 200 else p.summary,
                        "link": p.link,
                        "relevance_score": p.relevance_score
                    } for p in report.relevant_papers],
                    "explanation": report.explanation,
                    "key_risks": report.key_risks,
                    "recommendations": report.recommendations,
                    "detailed_report": report.detailed_report,
                    "assessment_timestamp": report.assessment_timestamp,
                }
                yield f"event: complete\ndata: {json.dumps(result_data)}\n\n"
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
    Assess feasibility from a text summary with real-time streaming.
    Now uses new ML-based structured pipeline.
    
    Args:
        body: {"summary": "text summary of project"}
        
    Returns:
        Server-sent events stream with feasibility assessment progress
    """
    print("\n" + "=" * 80)
    print("FEASIBILITY ASSESSMENT FROM SUMMARY - STREAMING")
    print("=" * 80)
    
    try:
        if not body or "summary" not in body:
            print("✗ Request body must contain 'summary' field")
            raise HTTPException(status_code=400, detail="Request body must contain 'summary' field")
        
        summary = body.get("summary", "").strip() if isinstance(body.get("summary"), str) else str(body.get("summary", "")).strip()
        
        if not summary:
            print("✗ Summary text cannot be empty")
            raise HTTPException(status_code=400, detail="Summary text cannot be empty")
        
        print(f"Summary: {summary[:100]}...")
        
        print("\n" + "-" * 80)
        print("Running assessment pipeline...")
        print("-" * 80)
        
        async def event_generator():
            try:
                print("\nStreaming stages:")
                yield f"event: status\ndata: {{\"message\": \"Starting assessment...\"}}\n\n"
                print("  • Starting assessment...")
                
                yield f"event: status\ndata: {{\"message\": \"Running ML prediction...\"}}\n\n"
                print("  • Running ML prediction...")
                
                yield f"event: status\ndata: {{\"message\": \"Searching for papers...\"}}\n\n"
                print("  • Searching for papers...")
                
                yield f"event: status\ndata: {{\"message\": \"Assessing feasibility...\"}}\n\n"
                print("  • Assessing feasibility...")
                
                # Convert to structured format
                print("\nConverting text to structured format...")
                structured_input = convert_text_to_structured(
                    summary=summary,
                    project_id="summary_input"
                )
                print(f"✓ Structured input created (Project ID: {structured_input.project_id})")
                
                # Run assessment
                print("\nRunning assessment pipeline...")
                assessment_state = run_new_assessment(structured_input)
                report = convert_state_to_report(assessment_state)
                
                # Print detailed results
                print("\n" + "-" * 80)
                print("RESULTS")
                print("-" * 80)
                print(f"✓ Assessment Complete!")
                print(f"  Final Score: {report.final_score}/100")
                print(f"  Status: {report.viability_status}")
                print(f"  ML Score: {report.ml_score:.1f}/100 (Confidence: {report.ml_confidence:.0%})")
                
                print("\nDimension Scores:")
                print(f"  Technical:  {report.technical_score}/100")
                print(f"  Resource:   {report.resource_score}/100")
                print(f"  Skills:     {report.skills_score}/100")
                print(f"  Scope:      {report.scope_score}/100")
                print(f"  Risk:       {report.risk_score}/100")
                
                if report.relevant_papers:
                    print(f"\nRelevant Papers ({len(report.relevant_papers)} found):")
                    for i, paper in enumerate(report.relevant_papers[:3], 1):
                        print(f"  {i}. {paper.title[:60]}...")
                        print(f"     Relevance: {paper.relevance_score:.2f}")
                
                print("\n" + "=" * 80)
                print("ASSESSMENT COMPLETE ✓")
                print("=" * 80 + "\n")
                
                # Send final result
                import json
                result_data = {
                    "final_score": report.final_score,
                    "viability_status": report.viability_status,
                    "ml_score": report.ml_score,
                    "ml_confidence": report.ml_confidence,
                    "technical_score": report.technical_score,
                    "resource_score": report.resource_score,
                    "skills_score": report.skills_score,
                    "scope_score": report.scope_score,
                    "risk_score": report.risk_score,
                    "relevant_papers": [{
                        "title": p.title,
                        "summary": p.summary[:200] if len(p.summary) > 200 else p.summary,
                        "link": p.link,
                        "relevance_score": p.relevance_score
                    } for p in report.relevant_papers],
                    "explanation": report.explanation,
                    "key_risks": report.key_risks,
                    "recommendations": report.recommendations,
                    "detailed_report": report.detailed_report,
                    "assessment_timestamp": report.assessment_timestamp,
                }
                yield f"event: complete\ndata: {json.dumps(result_data)}\n\n"
            except Exception as e:
                logger.error(f"Stream error: {str(e)}", exc_info=True)
                yield f"event: error\ndata: {{\"message\": \"Error: {str(e)}\"}}\n\n"
        
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
