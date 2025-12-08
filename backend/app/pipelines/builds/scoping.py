from langgraph.graph import StateGraph, END
from app.schemas.intermediate import IntermediateState
from app.pipelines.nodes.extract_text import extract_text_node
from app.pipelines.nodes.summarize_and_extract import summarize_and_extract_node


def _extract_text_dbg(state: IntermediateState) -> IntermediateState:
    print("[Scoping] >> extract_text: starting (file_path=", state.file_path, ")")
    before_len = len(state.raw_text) if state.raw_text else 0
    state = extract_text_node(state)
    after_len = len(state.raw_text) if state.raw_text else 0
    print(f"[Scoping] << extract_text: raw_text_len {before_len} -> {after_len}")
    return state


def _summarize_and_extract_dbg(state: IntermediateState) -> IntermediateState:
    print("[Scoping] >> summarize_and_extract: generating summary and extracting fields")
    state = summarize_and_extract_node(state)
    summary_len = len(state.summary) if state.summary else 0
    print(f"[Scoping] << summarize_and_extract: summary_len={summary_len}, domain={state.domain}, goals={len(state.goals or [])}")
    return state


def create_graph():
    graph = StateGraph(IntermediateState)
    graph.add_node("extract_text", _extract_text_dbg)
    graph.add_node("summarize_and_extract", _summarize_and_extract_dbg)

    graph.set_entry_point("extract_text")
    graph.add_edge("extract_text", "summarize_and_extract")
    graph.add_edge("summarize_and_extract", END)
    return graph.compile()