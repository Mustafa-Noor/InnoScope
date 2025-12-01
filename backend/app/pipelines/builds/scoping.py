from langgraph.graph import StateGraph, END
from app.schemas.intermediate import IntermediateState
from app.pipelines.nodes.extract_text import extract_text_node
from app.pipelines.nodes.check_research import check_research_node
from app.pipelines.nodes.summarize import summarize_node
from app.pipelines.nodes.fill_state import fill_state_node
from app.pipelines.nodes.refine_summary import refine_summary_node

def create_graph():
    graph = StateGraph(IntermediateState)
    graph.add_node("extract_text", extract_text_node)
    graph.add_node("check_research", check_research_node)
    graph.add_node("summarize", summarize_node)
    graph.add_node("fill_state", fill_state_node)
    graph.add_node("refine_summary", refine_summary_node)

    graph.set_entry_point("extract_text")
    graph.add_edge("extract_text", "check_research")
    # If not research-like, the node raises; otherwise continue
    graph.add_edge("check_research", "summarize")
    graph.add_edge("summarize", "fill_state")
    # Directly proceed to refinement without follow-up Q&A
    graph.add_edge("fill_state", "refine_summary")
    graph.add_edge("refine_summary", END)
    return graph.compile()