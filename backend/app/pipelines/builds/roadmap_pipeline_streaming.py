"""Streaming version of roadmap pipeline that yields status updates.

This module wraps the existing roadmap_pipeline and intercepts print statements
to yield them as status updates for real-time frontend display.
"""

from typing import Generator
from app.pipelines.builds.roadmap_pipeline import (
    CombinedState,
    _scoping_node,
    _research_node,
    _roadmap_node,
)
from app.utils.streaming import format_status, format_complete, format_error


def run_roadmap_pipeline_streaming(file_path: str) -> Generator[str, None, None]:
    """Run roadmap pipeline and yield status updates in SSE format.

    Emits coarse-grained stage progress so the frontend bar moves steadily:
    - 0% start
    - 15% scoping begin, 35% scoping done
    - 55% research begin, 75% research done
    - 90% roadmap begin, 100% complete
    """
    try:
        # Kickoff
        yield format_status("Starting roadmap generation pipeline...", progress=0, stage="init")

        state = CombinedState(file_path=file_path)

        # Scoping
        yield format_status("Analyzing document and extracting key information...", progress=15, stage="scoping")
        state = _scoping_node(state)
        yield format_status("Document analysis complete", progress=35, stage="scoping")

        # Research (only if we have a summary)
        if getattr(state, "summary", None):
            yield format_status("Gathering additional research and context...", progress=55, stage="research")
            state = _research_node(state)
            yield format_status("Research gathering complete", progress=75, stage="research")
        else:
            yield format_status("Skipping research (no summary available)", progress=55, stage="research")

        # Roadmap generation
        yield format_status("Generating implementation roadmap...", progress=90, stage="roadmap")
        state = _roadmap_node(state)

        status = "success" if state.roadmap else "warning"
        message = "Roadmap generated successfully!" if state.roadmap else "Roadmap generation completed with warnings"

        # Final status and completion payload
        yield format_status(message, progress=100, stage="complete")

        final_result = {
            "status": status,
            "message": message,
            "roadmap": state.roadmap,
            "initial_summary": state.initial_summary,
            "refined_summary": state.summary,
            "success": status == "success",
        }

        yield format_complete(final_result)

    except Exception as e:
        error_msg = f"Error during roadmap generation: {str(e)}"
        yield format_error(error_msg)
        raise


__all__ = ["run_roadmap_pipeline_streaming"]
