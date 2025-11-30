from app.services.research_checks import check_if_research
from app.services.summarize_research import summarize_research
from app.services.roadmap_generator import generate_roadmap
from app.utils.extract import extract_text
from app.schemas.roadmap import RoadmapPipelineInput, RoadmapPipelineOutput
from app.utils.llm import call_llm
from pydantic import ValidationError
from app.schemas.roadmap import RoadmapState

from app.pipelines.builds.scoping import create_graph
import os

def run_pipeline(file_path: str, user_input: str | None = None):
    state = {
        "file_path": file_path,
        "raw_text": None,
        "summary": None,
        "roadmap": None,
        "missing_fields": None,
        "refinement_count": 0,
        "user_input": user_input,
    }

    graph = create_graph()

    # First pass
    state = graph.invoke(state)

    # Human-in-the-loop loop
    # Human-in-the-loop loop using dict keys (simple English prompt)
    while state.get("missing_fields"):
        missing = ", ".join(state.get("missing_fields", []))
        print(f"Missing fields detected: {missing}")
        user_answer = input("Please describe the missing details in plain English: ").strip()
        state["user_input"] = user_answer if user_answer else None
        state = graph.invoke(state)

    return {
        "status": "success",
        "summary": state.get("summary"),
        "roadmap": state.get("roadmap"),
        "refinement_count": state.get("refinement_count", 0),
        "state": state,
    }

if __name__ == "__main__":
    print("Testing Roadmap Pipeline")
    print("==================================================")
    test_file = os.path.join(os.path.dirname(__file__), "test.docx")
    if os.path.exists(test_file):
        result = run_pipeline(test_file)
        print(result)
    else:
        print(f"❌ test.docx not found at {test_file}")