from app.services.summarize_research import refine_summary
from app.schemas.roadmap import RoadmapState

def refine_summary_node(state: RoadmapState):
    state.summary = refine_summary(state.summary, state)
    return state