from typing import List
import re

FIELDS_ORDER = ["problem_statement", "domain", "goals", "prerequisites", "key_topics"]
# Ask at most 3 focused questions before proceeding with assumptions
MIN_PAIRS_BEFORE_REFINE = 3


def _user_indicated_unknown(memory_text: str) -> bool:
    if not memory_text:
        return False
    # Look at the last few user lines for signals like "don't know", "not sure", etc.
    lines = [l.strip() for l in memory_text.splitlines() if l.strip()]
    # Iterate from bottom to find the last user message quickly
    for line in reversed(lines[-8:]):
        if line.lower().startswith("user:"):
            msg = line.split(":", 1)[1].strip().lower()
            patterns = [
                r"don't\s+know",
                r"do\s+not\s+know",
                r"not\s+sure",
                r"no\s+idea",
                r"you\s+decide",
                r"up\s*to\s*you",
                r"assume",
                r"whatever\s+you\s+think",
                r"can't\s+recall",
                r"unsure",
            ]
            if any(re.search(p, msg) for p in patterns):
                return True
            break
    return False


def chat_find_missing_node(state) -> object:
    missing: List[str] = []
    for f in FIELDS_ORDER:
        val = getattr(state, f, None)
        if val in [None, "", []]:
            missing.append(f)
    state.missing_fields = missing
    # Determine if user signaled that they don't know; if so we can assume
    state.assume_ok = _user_indicated_unknown(getattr(state, "memory_text", ""))
    return state


def chat_route_decision(state) -> str:
    missing = getattr(state, "missing_fields", [])
    pairs = getattr(state, "message_pairs", 0) or 0
    assume_ok = getattr(state, "assume_ok", False)
    if missing:
        # Keep questions to at most MIN_PAIRS_BEFORE_REFINE pairs unless user allows assumptions
        if pairs < MIN_PAIRS_BEFORE_REFINE and not assume_ok:
            return "ask"
        return "refine"
    # If nothing is missing but conversation is short, ask for more context unless we can assume
    if pairs < MIN_PAIRS_BEFORE_REFINE and not assume_ok:
        state.missing_fields = ["additional_context"]
        return "ask"
    return "refine"
