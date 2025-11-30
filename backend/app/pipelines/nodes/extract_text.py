from app.utils.extract import extract_text
from app.schemas.roadmap import RoadmapState

def extract_text_node(state: RoadmapState):
    # expects state.file_path to be set
    text = extract_text(state.file_path)
    state.raw_text = text
    return state
