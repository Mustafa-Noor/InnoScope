def chat_compose_baseline_node(state):
    lines = []
    if state.problem_statement:
        lines.append(f"Problem Statement: {state.problem_statement}")
    if state.domain:
        lines.append(f"Domain: {state.domain}")
    if state.goals:
        lines.append("Goals:\n- " + "\n- ".join(state.goals))
    if state.prerequisites:
        lines.append("Prerequisites:\n- " + "\n- ".join(state.prerequisites))
    if state.key_topics:
        lines.append("Key Topics:\n- " + "\n- ".join(state.key_topics))
    baseline = "\n\n".join(lines) or "Project scope details summarized."
    state.summary = baseline
    state.initial_summary = baseline
    return state
