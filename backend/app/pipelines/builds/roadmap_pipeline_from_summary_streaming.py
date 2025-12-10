"""Streaming roadmap pipeline that accepts a text summary instead of a document.

Flow:
 1. extract_fields -> extracts structured fields (goals, prerequisites, etc.) from summary text
 2. research       -> runs enrichment (wiki/ddg + synthesis) using extracted fields
 3. roadmap        -> generates final roadmap using consolidated research

Uses a LangGraph for proper state management and streaming.
"""

from typing import Generator, Optional
from langgraph.graph import StateGraph, END

from app.schemas.intermediate import IntermediateState
from app.schemas.research_state import ResearchState
from app.pipelines.builds.researcher import run_research_enrichment
from app.services.roadmap_generator import generate_roadmap
from app.services.extract_fields import extract_fields_from_summary
from app.utils.streaming import format_status, format_complete, format_error


class SummaryCombinedState(IntermediateState):
    """Extended state for summary-based roadmap generation."""
    research: Optional[ResearchState] = None
    roadmap: Optional[str] = None


def _extract_fields_node(state: SummaryCombinedState) -> SummaryCombinedState:
    """Extract structured fields from the input summary text."""
    print("[Roadmap-Summary] >> extract_fields: starting")
    
    if not state.summary:
        print("[Roadmap-Summary] !! extract_fields: no summary provided")
        return state
    
    try:
        # Extract fields using the extract_fields service
        extracted = extract_fields_from_summary(state.summary)
        
        # Update state with extracted fields - with type validation
        if extracted.get("problem_statement"):
            state.problem_statement = str(extracted["problem_statement"])
        if extracted.get("domain"):
            state.domain = str(extracted["domain"])
        
        # Ensure goals is always a list
        goals = extracted.get("goals", [])
        if isinstance(goals, str):
            state.goals = [goals] if goals else []
        elif isinstance(goals, list):
            state.goals = goals
        else:
            state.goals = []
        
        # Ensure prerequisites is always a list
        prerequisites = extracted.get("prerequisites", [])
        if isinstance(prerequisites, str):
            state.prerequisites = [prerequisites] if prerequisites else []
        elif isinstance(prerequisites, list):
            state.prerequisites = prerequisites
        else:
            state.prerequisites = []
        
        # Ensure key_topics is always a list
        key_topics = extracted.get("key_topics", [])
        if isinstance(key_topics, str):
            state.key_topics = [key_topics] if key_topics else []
        elif isinstance(key_topics, list):
            state.key_topics = key_topics
        else:
            state.key_topics = []
        
        print(
            "[Roadmap-Summary] << extract_fields: "
            f"problem_statement={bool(state.problem_statement)}, "
            f"domain={state.domain}, "
            f"goals={len(state.goals or [])}, "
            f"prerequisites={len(state.prerequisites or [])}, "
            f"key_topics={len(state.key_topics or [])}"
        )
    except Exception as e:
        print(f"[Roadmap-Summary] !! extract_fields error: {str(e)}")
        import traceback
        traceback.print_exc()
        # Initialize with empty lists to avoid validation errors
        state.goals = state.goals or []
        state.prerequisites = state.prerequisites or []
        state.key_topics = state.key_topics or []
    
    return state


def _research_node(state: SummaryCombinedState) -> SummaryCombinedState:
    """Run enrichment + synthesis using extracted fields."""
    print("[Roadmap-Summary] >> research: preparing enrichment")
    
    if not state.summary:
        print("[Roadmap-Summary] !! research: no summary to enrich")
        return state
    
    try:
        # Create ResearchState wrapping the intermediate state
        research_state = ResearchState(intermediate=IntermediateState(
            summary=state.summary,
            problem_statement=state.problem_statement,
            domain=state.domain,
            goals=state.goals or [],
            prerequisites=state.prerequisites or [],
            key_topics=state.key_topics or [],
        ))
        
        # Run enrichment with research
        research_state = run_research_enrichment(research_state, debug=False)
        state.research = research_state
        
        print(
            "[Roadmap-Summary] << research: "
            f"wiki_present={bool(getattr(research_state, 'wiki_summary', None))}, "
            f"ddg_results={len(getattr(research_state, 'ddg_results', []) or [])}, "
            f"consolidated_len={len(research_state.consolidated_research or '')}, "
            f"llm_report_len={len(research_state.llm_research_report or '')}"
        )
    except Exception as e:
        print(f"[Roadmap-Summary] !! research error: {str(e)}")
        # Continue without research; use summary alone
    
    return state


def _roadmap_node(state: SummaryCombinedState) -> SummaryCombinedState:
    """Generate roadmap using research and summary."""
    print("[Roadmap-Summary] >> roadmap: generating")
    
    try:
        llm_report = None
        consolidated = None
        summary = state.summary
        
        if state.research:
            llm_report = state.research.llm_research_report
            consolidated = state.research.consolidated_research
        
        if not (llm_report or consolidated or summary):
            print("[Roadmap-Summary] !! roadmap: no inputs available")
            state.roadmap = "Error: Unable to generate roadmap (no summary provided)"
            return state
        
        roadmap = generate_roadmap(llm_report, consolidated, summary)
        state.roadmap = roadmap.strip() if isinstance(roadmap, str) else roadmap
        
        print(f"[Roadmap-Summary] << roadmap: generated ({len(state.roadmap or '')} chars)")
    except Exception as e:
        print(f"[Roadmap-Summary] !! roadmap error: {str(e)}")
        state.roadmap = f"Error generating roadmap: {str(e)}"
    
    return state


def create_roadmap_from_summary_graph() -> StateGraph:
    """Create the roadmap graph for summary input."""
    graph = StateGraph(SummaryCombinedState)
    
    graph.add_node("extract_fields", _extract_fields_node)
    graph.add_node("research", _research_node)
    graph.add_node("roadmap", _roadmap_node)
    
    graph.add_edge("extract_fields", "research")
    graph.add_edge("research", "roadmap")
    graph.add_edge("roadmap", END)
    
    graph.set_entry_point("extract_fields")
    
    return graph.compile()


def run_roadmap_from_summary_streaming(summary: str) -> Generator[str, None, None]:
    """Run roadmap pipeline from text summary with streaming progress.
    
    Emits coarse-grained stage progress so the frontend bar moves steadily:
    - 0% start
    - 15% extract_fields begin, 35% extract_fields done
    - 55% research begin, 75% research done
    - 90% roadmap begin, 100% complete
    
    Args:
        summary: Text summary of the project
    
    Yields:
        SSE-formatted event strings with progress updates
    """
    try:
        print(f"[Roadmap-Summary Stream] Starting with summary ({len(summary)} chars)")
        
        # Kickoff
        yield format_status("Starting roadmap generation pipeline...", progress=0, stage="init")
        
        # Initialize state with the provided summary
        state = SummaryCombinedState(summary=summary)
        
        # Extract fields
        yield format_status("Extracting structured information from summary...", progress=15, stage="extract_fields")
        state = _extract_fields_node(state)
        yield format_status("Document analysis complete", progress=35, stage="extract_fields")
        
        # Research (only if we have a summary)
        if state.summary:
            yield format_status("Gathering additional research and context...", progress=55, stage="research")
            state = _research_node(state)
            yield format_status("Research gathering complete", progress=75, stage="research")
        else:
            yield format_status("Skipping research (no summary available)", progress=55, stage="research")
        
        # Roadmap generation
        yield format_status("Generating implementation roadmap...", progress=90, stage="roadmap")
        state = _roadmap_node(state)
        
        status = "success" if state.roadmap and "Error" not in state.roadmap else "warning"
        message = "Roadmap generated successfully!" if status == "success" else "Roadmap generation completed with warnings"
        
        result = {
            "status": status,
            "message": message,
            "roadmap": state.roadmap or "",
            "problem_statement": state.problem_statement,
            "domain": state.domain,
            "goals": state.goals or [],
            "prerequisites": state.prerequisites or [],
            "key_topics": state.key_topics or [],
        }
        
        print("[Roadmap-Summary Stream] Yielding complete event...")
        yield format_complete(result)
        print("[Roadmap-Summary Stream] Complete event yielded successfully")
        
    except Exception as e:
        print(f"[Roadmap-Summary Stream] ERROR: {str(e)}", exc_info=True)
        import traceback
        traceback.print_exc()
        yield format_error(str(e))

