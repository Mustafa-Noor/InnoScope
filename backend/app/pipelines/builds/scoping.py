from langgraph.graph import StateGraph, END
from app.schemas.intermediate import IntermediateState
from app.pipelines.nodes.extract_text import extract_text_node
from app.pipelines.nodes.check_research import check_research_node
from app.pipelines.nodes.summarize import summarize_node
from app.pipelines.nodes.fill_state import fill_state_node


def _extract_text_dbg(state: IntermediateState) -> IntermediateState:
    print("[Scoping] >> extract_text: starting (file_path=", state.file_path, ")")
    before_len = len(state.raw_text) if state.raw_text else 0
    state = extract_text_node(state)
    after_len = len(state.raw_text) if state.raw_text else 0
    print(f"[Scoping] << extract_text: raw_text_len {before_len} -> {after_len}")
    return state


def _check_research_dbg(state: IntermediateState) -> IntermediateState:
    print("[Scoping] >> check_research: assessing document type")
    state = check_research_node(state)
    flag = getattr(state, "is_research_like", None)
    print(f"[Scoping] << check_research: is_research_like={flag}")
    return state


def _summarize_dbg(state: IntermediateState) -> IntermediateState:
    print("[Scoping] >> summarize: generating initial summary (raw_len=", len(state.raw_text) if state.raw_text else 0, ")")
    state = summarize_node(state)
    summary_len = len(state.summary) if state.summary else 0
    print(f"[Scoping] << summarize: summary_len={summary_len}")
    # snapshot initial summary before refinement
    state.initial_summary = state.summary
    return state


def _fill_state_dbg(state: IntermediateState) -> IntermediateState:
    print("[Scoping] >> fill_state: extracting structured fields from summary")
    state = fill_state_node(state)
    print(
        "[Scoping] << fill_state: domain=", state.domain,
        ", goals=", len(state.goals or []),
        ", prerequisites=", len(state.prerequisites or []),
        ", key_topics=", len(state.key_topics or []),
    )
    return state


def create_graph():
    graph = StateGraph(IntermediateState)
    graph.add_node("extract_text", _extract_text_dbg)
    graph.add_node("check_research", _check_research_dbg)
    graph.add_node("summarize", _summarize_dbg)
    graph.add_node("fill_state", _fill_state_dbg)

    graph.set_entry_point("extract_text")
    graph.add_edge("extract_text", "check_research")
    graph.add_edge("check_research", "summarize")
    graph.add_edge("summarize", "fill_state")
    graph.add_edge("fill_state", END)
    return graph.compile()