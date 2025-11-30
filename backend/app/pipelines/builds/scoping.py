from langgraph.graph import StateGraph, END
from app.schemas.roadmap import RoadmapState
from app.pipelines.nodes.extract_text import extract_text_node
from app.pipelines.nodes.summarize import summarize_node
from app.pipelines.nodes.fill_state import fill_state_node
from app.pipelines.nodes.detect_missing import detect_missing_node
from app.pipelines.nodes.ask_for_missing import ask_for_missing_node
from app.pipelines.nodes.update_state import update_state_node
from app.pipelines.nodes.refine_summary import refine_summary_node

def create_graph():
    graph = StateGraph(RoadmapState)

    graph.add_node("extract_text", extract_text_node)
    graph.add_node("summarize", summarize_node)
    graph.add_node("fill_state", fill_state_node)
    graph.add_node("detect_missing", detect_missing_node)
    graph.add_node("ask_missing", ask_for_missing_node)
    graph.add_node("update_state", update_state_node)
    graph.add_node("refine_summary", refine_summary_node)

    graph.set_entry_point("extract_text")

    graph.add_edge("extract_text", "summarize")
    graph.add_edge("summarize", "fill_state")
    graph.add_edge("fill_state", "detect_missing")
    # Only ask the user if there are missing fields AND we have user_input to process.
    # Otherwise, proceed to refinement to avoid infinite cycles without human input.
    # Ask only when there are missing fields AND a user_input is present.
    # This prevents internal infinite loops during a single invoke.
    graph.add_conditional_edges(
        "detect_missing",
        lambda s: "ask" if (getattr(s, "missing_fields", None) and getattr(s, "user_input", None)) else "done",
        {"ask": "ask_missing", "done": "refine_summary"}
    )
    graph.add_edge("ask_missing", "update_state")
    graph.add_edge("update_state", "detect_missing")
    # Finish the graph after refinement to avoid infinite recursion
    graph.add_edge("refine_summary", END)

    return graph.compile()