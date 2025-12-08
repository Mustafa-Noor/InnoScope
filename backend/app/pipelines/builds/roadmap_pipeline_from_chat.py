"""Roadmap pipeline from chat session.

Flow:
 1. chat agent   -> runs existing chat agent to gather/refine project info
 2. research     -> runs enrichment (wiki/ddg + synthesis)
 3. roadmap      -> generates final roadmap text using consolidated research

Returns a ChatRoadmapState with refined summary, research, and roadmap.
"""

from typing import Optional
from langgraph.graph import StateGraph, END

from app.schemas.intermediate import IntermediateState
from app.schemas.research_state import ResearchState
from app.pipelines.builds.chat_agent import create_chat_graph, ChatState
from app.pipelines.builds.researcher import run_research_enrichment
from app.services.roadmap_generator import generate_roadmap


class ChatRoadmapState(ChatState):
    """Extend ChatState with research and roadmap output."""
    research: Optional[ResearchState] = None
    roadmap: Optional[str] = None


def _chat_agent_node(state: ChatRoadmapState) -> ChatRoadmapState:
    """Run the chat agent to refine project information."""
    print("[Roadmap From Chat] >> chat_agent: starting conversation")
    
    chat_graph = create_chat_graph()
    chat_state = chat_graph.invoke(state)
    
    if isinstance(chat_state, dict):
        chat_state = ChatState(**chat_state)
    
    # Copy refined data back to state
    for field in [
        "summary",
        "problem_statement",
        "domain",
        "goals",
        "prerequisites",
        "key_topics",
        "initial_summary",
        "reply_text",
    ]:
        if hasattr(chat_state, field):
            setattr(state, field, getattr(chat_state, field))
    
    print(
        "[Roadmap From Chat] << chat_agent: summary_len=", len(state.summary or ""),
        ", domain=", state.domain,
    )
    return state


def _research_node(state: ChatRoadmapState) -> ChatRoadmapState:
    """Run enrichment + synthesis using refined summary from chat."""
    print("[Roadmap From Chat] >> research: preparing enrichment (has_summary=", bool(state.summary), ")")
    
    if not state.summary:
        return state  # cannot enrich without summary
    
    research_state = ResearchState(intermediate=IntermediateState(
        raw_text=state.summary,
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
        "[Roadmap From Chat] << research: consolidated_len=", len(research_state.consolidated_research or ""),
        ", llm_report_len=", len(research_state.llm_research_report or ""),
    )
    return state


def _roadmap_node(state: ChatRoadmapState) -> ChatRoadmapState:
    """Generate roadmap using all available research layers."""
    print("[Roadmap From Chat] >> roadmap: generating (has_research=", bool(state.research), ")")
    
    llm_report = None
    consolidated = None
    summary = state.summary
    
    if state.research:
        llm_report = state.research.llm_research_report
        consolidated = state.research.consolidated_research
    
    if not (llm_report or consolidated or summary):
        print("[Roadmap From Chat] !! roadmap: skipped (no inputs available)")
        return state
    
    roadmap = generate_roadmap(llm_report, consolidated, summary)
    state.roadmap = roadmap.strip() if isinstance(roadmap, str) else roadmap
    
    print("[Roadmap From Chat] << roadmap: output_len=", len(state.roadmap or ""))
    return state


def create_roadmap_from_chat_graph():
    """Build the roadmap from chat pipeline as a LangGraph."""
    graph = StateGraph(ChatRoadmapState)
    
    graph.add_node("chat_agent", _chat_agent_node)
    graph.add_node("research", _research_node)
    graph.add_node("roadmap", _roadmap_node)
    
    graph.set_entry_point("chat_agent")
    graph.add_edge("chat_agent", "research")
    graph.add_edge("research", "roadmap")
    graph.add_edge("roadmap", END)
    
    return graph.compile()


def run_roadmap_from_chat(memory_text: str, message_pairs: int = 0) -> ChatRoadmapState:
    """
    Generate roadmap from chat session context.
    
    Args:
        memory_text: Chat context/memory from session
        message_pairs: Number of message pairs in conversation
    
    Returns:
        ChatRoadmapState with refined summary, research, and roadmap
    """
    print("[Roadmap From Chat] START pipeline")
    
    graph = create_roadmap_from_chat_graph()
    
    initial = ChatRoadmapState(
        memory_text=memory_text,
        message_pairs=message_pairs,
    )
    
    result = graph.invoke(initial)
    
    if isinstance(result, dict):
        result = ChatRoadmapState(**result)
    
    print(f"[Roadmap From Chat] END pipeline roadmap_len={len(result.roadmap or '')}")
    return result


__all__ = ["create_roadmap_from_chat_graph", "run_roadmap_from_chat", "ChatRoadmapState"]
