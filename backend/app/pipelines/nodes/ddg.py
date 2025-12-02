from app.schemas.research_state import ResearchState
from app.utils.ddg import gather_ddg_supporting_text


def ddg_node(state: ResearchState) -> ResearchState:
	"""Populate `ddg_results` with aggregated DuckDuckGo snippets.

	Strategy:
	  - Query DDG for each relevant field via the utility.
	  - Flatten categorized contexts into a single ordered list (limited size).
	  - Initialize or extend `consolidated_research` with a short synthesized block.
	"""
	if not state.intermediate:
		return state

	interm = state.intermediate

	contexts = gather_ddg_supporting_text(
		problem_statement=interm.problem_statement,
		domain=interm.domain,
		goals=interm.goals,
		prerequisites=interm.prerequisites,
		key_topics=interm.key_topics,
	)
	if not contexts:
		return state

	ordered_keys = [
		"domain_context",
		"problem_context",
		"goals_context",
		"prerequisites_context",
		"key_topics_context",
	]

	flat_snippets = []
	for k in ordered_keys:
		vals = contexts.get(k) or []
		flat_snippets.extend(vals)
		if len(flat_snippets) > 120:  # safety cap
			break

	state.ddg_results = flat_snippets

	# Build a concise block for consolidated_research if desired
	if flat_snippets:
		block_parts = []
		if contexts.get("domain_context"):
			block_parts.append("Domain(DDG): " + " ".join(contexts["domain_context"][:3]))
		if contexts.get("problem_context"):
			block_parts.append("Problem(DDG): " + " ".join(contexts["problem_context"][:3]))
		if contexts.get("goals_context"):
			block_parts.append("Goals(DDG): " + " ".join(contexts["goals_context"][:4]))
		if contexts.get("prerequisites_context"):
			block_parts.append(
				"Prerequisites(DDG): " + " ".join(contexts["prerequisites_context"][:4])
			)
		if contexts.get("key_topics_context"):
			block_parts.append(
				"Key Topics(DDG): " + " ".join(contexts["key_topics_context"][:6])
			)

		ddg_block = "\n".join(block_parts)

		if not state.consolidated_research:
			state.consolidated_research = ddg_block
		else:
			# Append while keeping separation
			state.consolidated_research += "\n\n" + ddg_block

	return state



