from typing import Optional

from app.schemas.research_state import ResearchState
from app.utils.wiki import gather_wiki_supporting_text


def wiki_node(state: ResearchState) -> ResearchState:
	"""Enrich the research state with Wikipedia-derived context.

	Steps:
	  1. Use existing intermediate fields (problem_statement, domain, goals,
		 prerequisites, key_topics) to fetch contextual sentences.
	  2. Construct a multi-paragraph `wiki_summary`.
	  3. If `consolidated_research` is still empty, initialize it with the
		 `wiki_summary` as a starting point (can be expanded later).

	Returns the mutated `ResearchState`.
	"""

	# Guard: if intermediate missing, nothing to do.
	if not state.intermediate:
		return state

	interm = state.intermediate

	contexts = gather_wiki_supporting_text(
		problem_statement=interm.problem_statement,
		domain=interm.domain,
		goals=interm.goals,
		prerequisites=interm.prerequisites,
		key_topics=interm.key_topics,
	)

	if not contexts:
		return state

	parts = []

	domain_ctx = contexts.get("domain_context") or []
	if domain_ctx:
		parts.append("Domain: " + " ".join(domain_ctx))

	prob_ctx = contexts.get("problem_context") or []
	if prob_ctx:
		parts.append("Problem Context: " + " ".join(prob_ctx))

	goals_ctx = contexts.get("goals_context") or []
	if goals_ctx:
		parts.append("Goals Context: " + " ".join(goals_ctx[:5]))

	prereq_ctx = contexts.get("prerequisites_context") or []
	if prereq_ctx:
		parts.append("Prerequisites Context: " + " ".join(prereq_ctx[:5]))

	topics_ctx = contexts.get("key_topics_context") or []
	if topics_ctx:
		# Keep it concise but representative
		parts.append("Key Topics Context: " + " ".join(topics_ctx[:10]))

	# Join into summary
	if parts:
		state.wiki_summary = "\n\n".join(parts)
		# Initialize consolidated_research if still empty
		if not state.consolidated_research:
			state.consolidated_research = state.wiki_summary

	return state



