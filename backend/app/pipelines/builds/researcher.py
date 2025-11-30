from langgraph.graph import StateGraph, END
import sys
from pathlib import Path

from app.schemas.research_state import ResearchState
from app.schemas.roadmap import IntermediateState
from app.pipelines.nodes.llm import research_llm_router_node
from app.pipelines.builds.scoping import create_graph as create_refined_graph


def _debug_router_node(state: ResearchState) -> ResearchState:
	"""Wrapper around the LLM router adding debug print statements.

	Prints before/after snapshots so you can verify execution steps.
	"""
	print("[ResearchGraph] ENTER router node")
	interm = state.intermediate
	if interm:
		print(
			f"[ResearchGraph] Initial fields: domain={interm.domain!r}, problem_present={bool(interm.problem_statement)}, "
			f"goals={len(interm.goals or [])}, topics={len(interm.key_topics or [])}, prerequisites={len(interm.prerequisites or [])}"
		)
		print(
			f"[ResearchGraph] Summary chars={len(interm.summary or '')}, consolidated_present={bool(state.consolidated_research)}"
		)

	state = research_llm_router_node(state)

	# After enrichment
	print(
		f"[ResearchGraph] wiki_summary={'yes' if state.wiki_summary else 'no'}, ddg_results={'yes' if state.ddg_results else 'no'}"
	)
	print(
		f"[ResearchGraph] llm_report_chars={len(state.llm_research_report or '')}, consolidated_chars={len(state.consolidated_research or '')}"
	)
	if state.llm_research_report:
		print("[ResearchGraph] llm_report_preview=", (state.llm_research_report[:220] + "...") if len(state.llm_research_report) > 250 else state.llm_research_report)
	print("[ResearchGraph] EXIT router node")
	return state


def create_research_graph(debug: bool = True):
	"""Compile the research enrichment graph.

	If `debug` is True, uses wrapper with print statements.
	Assumes `ResearchState.intermediate` already populated by previous pipeline.
	"""
	graph = StateGraph(ResearchState)
	graph.add_node("route_and_arrange", _debug_router_node if debug else research_llm_router_node)
	graph.set_entry_point("route_and_arrange")
	graph.add_edge("route_and_arrange", END)
	return graph.compile()


def run_research_enrichment(state: ResearchState, debug: bool = True) -> ResearchState:
	"""Run enrichment & synthesis on an already prepared ResearchState with optional debug prints.

	Handles LangGraph returning a dict by rehydrating into `ResearchState`.
	"""
	print("[ResearchGraph] Starting enrichment run (debug=%s)" % debug)
	graph = create_research_graph(debug=debug)
	result = graph.invoke(state)
	if isinstance(result, dict):
		# LangGraph compiled graphs often return a plain dict; reconstruct model.
		try:
			final_state = ResearchState(**result)
		except Exception as e:
			print("[ResearchGraph] ERROR reconstructing ResearchState from dict:", e)
			# Fallback: attach known keys manually
			final_state = state
	else:
		final_state = result
	print("[ResearchGraph] Enrichment run complete")
	return final_state


def run_full_research(file_path: str, debug: bool = True) -> ResearchState:
	"""Run refined summary pipeline then enrichment, handling dict returns.

	Rehydrates dict output from refined graph into `IntermediateState`.
	"""
	print(f"[MainResearch] Starting full research pipeline for: {file_path}")
	refined_graph = create_refined_graph()
	refined_result = refined_graph.invoke(IntermediateState(file_path=file_path))
	if isinstance(refined_result, dict):
		try:
			intermediate = IntermediateState(**refined_result)
		except Exception as e:
			print("[MainResearch] ERROR reconstructing IntermediateState:", e)
			# Minimal fallback: map known fields
			intermediate = IntermediateState(
				raw_text=refined_result.get("raw_text"),
				file_path=refined_result.get("file_path"),
				problem_statement=refined_result.get("problem_statement"),
				domain=refined_result.get("domain"),
				goals=refined_result.get("goals"),
				prerequisites=refined_result.get("prerequisites"),
				key_topics=refined_result.get("key_topics"),
				summary=refined_result.get("summary"),
				missing_fields=refined_result.get("missing_fields"),
				last_question=refined_result.get("last_question"),
				followup_attempts=refined_result.get("followup_attempts", 0),
			)
	else:
		intermediate = refined_result
	print("[MainResearch] Refined pipeline complete. Summary chars=", len(intermediate.summary or ""))
	state = ResearchState(intermediate=intermediate)
	state = run_research_enrichment(state, debug=debug)
	print("[MainResearch] Completed enrichment. Consolidated chars=", len(state.consolidated_research or ""))
	return state


def _print_final(state: ResearchState):
	print("\n========== FINAL RESEARCH OUTPUT ==========")
	print("Source Used: ", "wiki" if state.wiki_summary else ("ddg" if state.ddg_results else "unknown"))
	print("Domain: ", state.intermediate.domain)
	print("Problem: ", state.intermediate.problem_statement)
	print("Goals: ", ", ".join(state.intermediate.goals or []))
	print("Key Topics: ", ", ".join(state.intermediate.key_topics or []))
	print("Prerequisites: ", ", ".join(state.intermediate.prerequisites or []))
	print("\n--- LLM Research Report ---\n")
	print(state.llm_research_report or "<none>")
	print("\n--- Consolidated Research (truncated) ---\n")
	con = state.consolidated_research or "<none>"
	print(con if len(con) < 4000 else con[:4000] + "... [truncated]")
	print("===========================================\n")


# if __name__ == "__main__":
# 	default_docx = Path(__file__).resolve().parent.parent / "test.docx"
# 	debug = True
# 	# Accept: python -m app.pipelines.builds.researcher [path] [--no-debug]
# 	args = [a for a in sys.argv[1:] if a != "--no-debug"]
# 	if "--no-debug" in sys.argv:
# 		debug = False
# 	if args:
# 		path_arg = args[0]
# 	else:
# 		path_arg = str(default_docx)
# 	if not Path(path_arg).exists():
# 		print("Usage: python -m app.pipelines.builds.researcher <path-to-file> [--no-debug]")
# 		print(f"Provided or default file not found: {path_arg}")
# 		print(f"Expected default location: {default_docx}")
# 		sys.exit(2)
# 	print(f"[MainResearch] Using file: {path_arg} (debug={debug})")
# 	final_state = run_full_research(path_arg, debug=debug)
# 	_print_final(final_state)


__all__ = ["create_research_graph", "run_research_enrichment", "run_full_research"]


