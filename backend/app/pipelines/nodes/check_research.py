from app.services.research_check import check_if_research
from app.schemas.roadmap_state import RoadmapState

def check_research_node(state: RoadmapState):
    """
    Check if the extracted text is a research paper.
    """
    if not getattr(state, "raw_text", None):
        raise ValueError("No text found to check for research paper.")
    
    if not check_if_research(state.raw_text):
        raise ValueError("This is not a research paper. Please provide a research-oriented document.")
    
    return state