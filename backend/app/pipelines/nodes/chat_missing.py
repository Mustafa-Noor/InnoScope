from typing import List

FIELDS_ORDER = ["problem_statement", "domain", "goals", "prerequisites", "key_topics"]


def chat_find_missing_node(state) -> object:
    missing: List[str] = []
    for f in FIELDS_ORDER:
        val = getattr(state, f, None)
        if val in [None, "", []]:
            missing.append(f)
    state.missing_fields = missing
    return state


def chat_route_decision(state) -> str:
    return "ask" if getattr(state, "missing_fields", []) else "refine"
