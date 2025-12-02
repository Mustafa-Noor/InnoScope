from typing import Optional, List
from langgraph.graph import StateGraph, END
from pydantic import BaseModel

from app.schemas.intermediate import IntermediateState
from app.pipelines.nodes.chat_extract import chat_extract_fields_node
from app.pipelines.nodes.chat_missing import chat_find_missing_node, chat_route_decision
from app.pipelines.nodes.chat_question import chat_generate_question_node
from app.pipelines.nodes.chat_compose_baseline import chat_compose_baseline_node
from app.pipelines.nodes.chat_refine_research_style import chat_refine_research_style_node


class ChatState(IntermediateState):
    memory_text: Optional[str] = None
    reply_text: Optional[str] = None
    missing_fields: Optional[List[str]] = None
    completed: Optional[bool] = None


def _finalize_node(state: ChatState) -> ChatState:
    # If refined summary exists, respond with it
    if state.summary and not state.reply_text:
        state.reply_text = state.summary
    state.completed = True
    return state


def create_chat_graph():
    graph = StateGraph(ChatState)
    graph.add_node("extract", chat_extract_fields_node)
    graph.add_node("find_missing", chat_find_missing_node)
    graph.add_node("generate_question", chat_generate_question_node)
    graph.add_node("compose_baseline", chat_compose_baseline_node)
    graph.add_node("refine_summary", chat_refine_research_style_node)
    graph.add_node("finalize", _finalize_node)

    graph.set_entry_point("extract")
    graph.add_edge("extract", "find_missing")
    graph.add_conditional_edges("find_missing", chat_route_decision, {
        "ask": "generate_question",
        "refine": "compose_baseline",
    })
    graph.add_edge("generate_question", END)
    graph.add_edge("compose_baseline", "refine_summary")
    graph.add_edge("refine_summary", "finalize")
    graph.add_edge("finalize", END)
    return graph.compile()


def run_chat_turn(memory_text: str) -> ChatState:
    graph = create_chat_graph()
    initial = ChatState(memory_text=memory_text)
    result = graph.invoke(initial)
    if isinstance(result, dict):
        result = ChatState(**result)
    return result


__all__ = ["ChatState", "create_chat_graph", "run_chat_turn"]
