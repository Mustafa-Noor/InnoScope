"""LLM-driven source selection and comprehensive research arrangement node.

Workflow:
 1. Inspect `ResearchState.intermediate` fields + existing summary.
 2. Ask LLM (Gemini) to decide which enrichment source to use: `wiki` or `ddg`.
 3. Invoke the chosen enrichment node (`wiki_node` or `ddg_node`).
 4. Ask LLM to synthesize a cohesive `llm_research_report` combining:
	  - core required fields
	  - selected enrichment output (wiki_summary or ddg_results)
	  - brief rationale of source choice
 5. Update `consolidated_research` (append if already present).

Fails gracefully if LLM errors (keeps state unchanged except for noting error).
"""

import json
from typing import Literal

from app.schemas.research_state import ResearchState
from app.utils.llm import call_llm
from app.pipelines.nodes.wiki import wiki_node
from app.pipelines.nodes.ddg import ddg_node


DECISION_INSTRUCTIONS = """
You are a routing assistant deciding which external source better suits enrichment:
- Choose "wiki" for deeper background, conceptual depth, domain-heavy or academic topics.
- Choose "ddg" for broad, surface-level, multi-goal, trend or diverse snippet needs.
Return STRICT JSON like:
{"source": "wiki", "reason": "Needs authoritative background on technical domain"}
Fields:
  source: one of ["wiki", "ddg"]
  reason: concise rationale (< 160 chars)
Do not add commentary outside JSON.
""".strip()


ARRANGE_INSTRUCTIONS = """
You are a research arranger. Given required fields and enrichment data, produce a
concise but rich synthesis for product/roadmap planning.
Output format:
1. Executive Overview (2-3 sentences)
2. Problem & Context (bullet-like compact sentences)
3. Goals Elaboration (comma-separated refinement)
4. Key Topics & Their Roles (short list)
5. Prerequisites & Dependencies (short list)
6. Strategic Considerations (1 paragraph)
Return ONLY the arranged text (no JSON, no extra commentary).
""".strip()


def _safe_json_extract(raw: str) -> dict:
	try:
		start = raw.find("{")
		end = raw.rfind("}")
		if start == -1 or end == -1:
			return {}
		return json.loads(raw[start : end + 1])
	except Exception:
		return {}


def _decide_source(state: ResearchState) -> tuple[Literal["wiki", "ddg"], str]:
	interm = state.intermediate
	summary = (interm.summary or "")
	prompt = (
		f"{DECISION_INSTRUCTIONS}\n\n"  # instructions
		f"Domain: {interm.domain}\n"
		f"Problem: {interm.problem_statement}\n"
		f"Goals: {', '.join(interm.goals or [])}\n"
		f"Prerequisites: {', '.join(interm.prerequisites or [])}\n"
		f"Key Topics: {', '.join(interm.key_topics or [])}\n"
		f"Summary: {summary}\n"
	)
	raw = call_llm(prompt)
	data = _safe_json_extract(raw)
	source = data.get("source", "wiki")
	if source not in {"wiki", "ddg"}:
		source = "wiki"
	reason = data.get("reason", "LLM defaulted to wiki.")
	return source, reason


def _arrange_report(state: ResearchState, source_choice: str, reason: str) -> str:
	interm = state.intermediate
	enrichment_block = ""
	if source_choice == "wiki" and state.wiki_summary:
		enrichment_block = state.wiki_summary[:2500]
	elif source_choice == "ddg" and state.ddg_results:
		enrichment_block = " | ".join(state.ddg_results[:40])[:2500]

	prompt = (
		f"{ARRANGE_INSTRUCTIONS}\n\n"
		f"Source Chosen: {source_choice}\nReason: {reason}\n\n"
		f"Domain: {interm.domain}\n"
		f"Problem Statement: {interm.problem_statement}\n"
		f"Goals: {', '.join(interm.goals or [])}\n"
		f"Key Topics: {', '.join(interm.key_topics or [])}\n"
		f"Prerequisites: {', '.join(interm.prerequisites or [])}\n"
		f"Enrichment Data:\n{enrichment_block}\n"
	)
	arranged = call_llm(prompt)
	return arranged.strip()


def research_llm_router_node(state: ResearchState) -> ResearchState:
	"""Master LLM node performing source routing + arrangement.

	- Decides between wiki or ddg.
	- Invokes the chosen enrichment node if not yet populated.
	- Produces `llm_research_report` and updates `consolidated_research`.
	"""
	if not state.intermediate:
		return state

	source, reason = _decide_source(state)

	# Enrich accordingly only if not already enriched for that source
	if source == "wiki" and not state.wiki_summary:
		state = wiki_node(state)
	elif source == "ddg" and not state.ddg_results:
		state = ddg_node(state)

	# Arrange final report
	report = _arrange_report(state, source, reason)
	state.llm_research_report = report

	if state.consolidated_research:
		state.consolidated_research += "\n\n--- LLM Synthesized Report ---\n" + report
	else:
		state.consolidated_research = report

	return state


__all__ = ["research_llm_router_node"]


