import re
from app.services.summarize_research import summarize_research
from app.schemas.roadmap import RoadmapState

def summarize_node(state: RoadmapState):
    summary = summarize_research(state.raw_text or "")
    # Strip triple backticks to keep plain text
    if isinstance(summary, str):
        summary = re.sub(r"^```(?:\w+)?\s*|\s*```$", "", summary.strip(), flags=re.MULTILINE)
    state.summary = summary
    return state

