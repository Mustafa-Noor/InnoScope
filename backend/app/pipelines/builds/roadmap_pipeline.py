"""Unified roadmap pipeline graph.

Flow:
 1. scoping    -> runs existing refined summary graph to populate IntermediateState
 2. research   -> runs enrichment (wiki/ddg + synthesis) to produce ResearchState
 3. roadmap    -> generates final roadmap text using consolidated research

Returns a CombinedState; helper converts to RoadmapPipelineOutput.
"""

from typing import Optional
from langgraph.graph import StateGraph, END

from app.schemas.intermediate import IntermediateState, RoadmapPipelineOutput
from app.schemas.research_state import ResearchState
from app.pipelines.builds.scoping import create_graph as create_scoping_graph
from app.pipelines.builds.researcher import run_research_enrichment
from app.services.roadmap_generator import generate_roadmap


class CombinedState(IntermediateState):
    # Extend base intermediate with enrichment + final output
    research: Optional[ResearchState] = None
    roadmap: Optional[str] = None


def _scoping_node(state: CombinedState) -> CombinedState:
    """Run the existing scoping graph starting from current state's file_path/raw_text."""
    print("[Roadmap] >> scoping: starting (file_path=", state.file_path, ")")
    scoping = create_scoping_graph()
    # Invoke with a fresh IntermediateState carrying file_path/raw_text (others ignored initially)
    start = IntermediateState(file_path=state.file_path, raw_text=state.raw_text)
    result = scoping.invoke(start)
    # result may be dict if graph compiled; normalize
    if isinstance(result, dict):
        result = IntermediateState(**result)
    # Copy fields back onto combined state
    for field in [
        "raw_text",
        "file_path",
        "problem_statement",
        "domain",
        "goals",
        "prerequisites",
        "key_topics",
        "initial_summary",
        "summary",
    ]:
        setattr(state, field, getattr(result, field))
    print(
        "[Roadmap] << scoping: raw_len=", len(state.raw_text or ""),
        ", summary_len=", len(state.summary or ""),
        ", goals=", len(state.goals or []),
        ", prerequisites=", len(state.prerequisites or []),
        ", key_topics=", len(state.key_topics or []),
    )
    return state


def _research_node(state: CombinedState) -> CombinedState:
    """Run enrichment + synthesis using ResearchState wrapping current intermediate."""
    print("[Roadmap] >> research: preparing enrichment (has_summary=", bool(state.summary), ")")
    if not state.summary:
        return state  # cannot enrich without summary
    research_state = ResearchState(intermediate=IntermediateState(
        raw_text=state.raw_text,
        file_path=state.file_path,
        problem_statement=state.problem_statement,
        domain=state.domain,
        goals=state.goals,
        prerequisites=state.prerequisites,
        key_topics=state.key_topics,
        summary=state.summary,
    ))
    research_state = run_research_enrichment(research_state, debug=False)
    state.research = research_state
    print(
        "[Roadmap] << research: wiki_present=", bool(getattr(research_state, "wiki_summary", None)),
        ", ddg_results=", len(getattr(research_state, "ddg_results", []) or []),
        ", consolidated_len=", len(research_state.consolidated_research or ""),
        ", llm_report_len=", len(research_state.llm_research_report or ""),
    )
    return state


def _roadmap_node(state: CombinedState) -> CombinedState:
    """Generate roadmap using all available research layers."""
    print("[Roadmap] >> roadmap: generating (has_research=", bool(state.research), ")")
    llm_report = None
    consolidated = None
    summary = state.summary
    if state.research:
        llm_report = state.research.llm_research_report
        consolidated = state.research.consolidated_research
        # summary already exists in intermediate
    if not (llm_report or consolidated or summary):
        print("[Roadmap] !! roadmap: skipped (no inputs available)")
        return state
    roadmap = generate_roadmap(llm_report, consolidated, summary)
    state.roadmap = roadmap.strip() if isinstance(roadmap, str) else roadmap
    print(
        "[Roadmap] << roadmap: output_len=", len(state.roadmap or ""),
        ", headings_present=", sum(1 for h in [
            "1. Prototype Development",
            "2. Testing & Validation",
            "3. Funding & Grants",
            "4. Manufacturing / Implementation",
            "5. Marketing & Promotion",
            "6. Launch / Deployment",
            "7. Maintenance & Iteration",
            "8. Scaling & Expansion",
        ] if (state.roadmap or "").find(h) != -1),
    )
    return state


def create_roadmap_graph():
    graph = StateGraph(CombinedState)
    graph.add_node("scoping", _scoping_node)
    graph.add_node("research", _research_node)
    graph.add_node("roadmap", _roadmap_node)
    graph.set_entry_point("scoping")
    graph.add_edge("scoping", "research")
    graph.add_edge("research", "roadmap")
    graph.add_edge("roadmap", END)
    return graph.compile()


def run_roadmap_pipeline(file_path: str) -> RoadmapPipelineOutput:
    graph = create_roadmap_graph()
    initial = CombinedState(file_path=file_path)
    print("[Roadmap] START pipeline")
    result = graph.invoke(initial)
    # If result is dict (compiled graph), reconstruct CombinedState
    if isinstance(result, dict):
        result = CombinedState(**result)
    status = "success" if result.roadmap else "warning"
    message = "Roadmap generated" if result.roadmap else "Roadmap missing (no source text)"
    print(f"[Roadmap] END pipeline status={status}")
    return RoadmapPipelineOutput(
        status=status,
        message=message,
        roadmap=result.roadmap,
        initial_summary=result.initial_summary,
        refined_summary=result.summary,
    )


__all__ = ["create_roadmap_graph", "run_roadmap_pipeline", "CombinedState"]


if __name__ == "__main__":
    import sys
    from pathlib import Path

    default_docx = Path(__file__).resolve().parent.parent / "test.docx"
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    path_arg = args[0] if args else str(default_docx)
    if not Path(path_arg).exists():
        print("Usage: python -m app.pipelines.builds.roadmap_pipeline <path-to-file>")
        print(f"Provided or default file not found: {path_arg}")
        print(f"Expected default location: {default_docx}")
        sys.exit(2)
    print(f"[RoadmapMain] Running unified roadmap pipeline for: {path_arg}")
    output = run_roadmap_pipeline(path_arg)
    print(f"[RoadmapMain] Status: {output.status} | Message: {output.message}")
    if output.roadmap:
        print("\n===== ROADMAP (preview) =====")
        preview = output.roadmap if len(output.roadmap) < 3000 else output.roadmap[:3000] + "... [truncated]"
        print(preview)
        print("\n=== HEADINGS CHECK ===")
        for h in [
            "1. Prototype Development",
            "2. Testing & Validation",
            "3. Funding & Grants",
            "4. Manufacturing / Implementation",
            "5. Marketing & Promotion",
            "6. Launch / Deployment",
            "7. Maintenance & Iteration",
            "8. Scaling & Expansion",
        ]:
            present = h in output.roadmap
            print(f"{h}: {'OK' if present else 'MISSING'}")
    else:
        print("[RoadmapMain] No roadmap produced.")


