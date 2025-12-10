"""Research enrichment router node - source selection without LLM synthesis.

Workflow (optimized for token efficiency):
 1. Inspect `ResearchState.intermediate` fields + existing summary.
 2. Use heuristic routing (no LLM) to decide wiki vs ddg.
 3. Invoke the chosen enrichment node (`wiki_node` or `ddg_node`).
 4. Use raw enrichment directly (no LLM synthesis to llm_research_report).
 5. Update `consolidated_research` with raw enrichment data.

Token optimization: Skips expensive LLM arrangement/synthesis step.
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


# Removed: ARRANGE_INSTRUCTIONS - no longer needed (skip LLM synthesis)


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
	"""Use heuristic routing instead of LLM to save tokens.
	
	Routes to:
	- wiki: Academic/technical domains, single focused goal
	- ddg: Business/market domains, multiple diverse goals
	"""
	interm = state.intermediate
	domain = (interm.domain or "").lower()
	goals = interm.goals or []
	
	# Heuristic: Check domain keywords
	academic_keywords = ["research", "academic", "science", "technology", "engineering", "medical", "computer", "physics", "chemistry", "biology"]
	business_keywords = ["business", "market", "startup", "finance", "sales", "marketing", "commerce", "industry", "trend"]
	
	domain_is_academic = any(kw in domain for kw in academic_keywords)
	domain_is_business = any(kw in domain for kw in business_keywords)
	
	# Routes to wiki if:
	# - Academic domain with 1-2 focused goals, OR
	# - Domain is not explicitly business-oriented
	if domain_is_academic and len(goals) <= 2:
		return "wiki", "Academic domain with focused scope, using Wiki for depth"
	elif domain_is_business or len(goals) >= 3:
		return "ddg", "Business/market domain or multiple goals, using DDG for breadth"
	else:
		# Default based on goal diversity
		if len(goals) >= 2:
			return "ddg", "Multiple goals require broad source coverage"
		else:
			return "wiki", "Single focused goal, using Wiki for authoritative context"


# Removed: _arrange_report - using raw enrichment data directly to save tokens


def research_llm_router_node(state: ResearchState) -> ResearchState:
	"""Master router node performing source selection and enrichment.

	- Decides between wiki or ddg using heuristics (no LLM call).
	- Invokes the chosen enrichment node if not yet populated.
	- Sets llm_research_report to raw enrichment (no LLM synthesis).
	- Updates consolidated_research with enrichment data.

	Token optimization: Skips LLM synthesis step, uses raw enrichment directly.
	"""
	if not state.intermediate:
		return state

	source, reason = _decide_source(state)

	# Enrich accordingly only if not already enriched for that source
	if source == "wiki" and not state.wiki_summary:
		state = wiki_node(state)
	elif source == "ddg" and not state.ddg_results:
		state = ddg_node(state)

	# Use raw enrichment directly - no LLM arrangement call
	# This saves significant tokens by skipping synthesis step
	if source == "wiki" and state.wiki_summary:
		# Use wiki summary directly as the report (truncate to 3000 chars)
		report = state.wiki_summary[:3000]
	elif source == "ddg" and state.ddg_results:
		# Format DDG results as bullet list (use top 15 results)
		report = "\n".join([f"- {result}" for result in state.ddg_results[:15]])
	else:
		report = ""

	state.llm_research_report = report

	if state.consolidated_research:
		state.consolidated_research += "\n\n--- Enrichment Data ---\n" + report
	else:
		state.consolidated_research = report

	return state


__all__ = ["research_llm_router_node"]


