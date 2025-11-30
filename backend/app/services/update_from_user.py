import json
import re
from typing import Dict, Any
from app.utils.llm import call_llm

def _extract_json_string(s: str) -> str:
    if not s:
        return ""
    s = s.strip()
    # Strip markdown code fences
    s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s, flags=re.MULTILINE)
    # Extract first JSON object
    m = re.search(r"\{[\s\S]*\}", s)
    return m.group(0) if m else s

def _parse_kv_fallback(s: str) -> Dict[str, Any]:
    """
    Parse simple `key: value` lines into a dict as a fallback when JSON parsing fails.
    Only includes known missing keys present in the input.
    """
    result: Dict[str, Any] = {}
    lines = [ln.strip() for ln in s.splitlines() if ln.strip()]
    for ln in lines:
        if ":" in ln:
            key, val = ln.split(":", 1)
            result[key.strip()] = val.strip()
    return result

def _remaining_missing(state, before_missing):
    remaining = []
    for key in before_missing or []:
        val = getattr(state, key, None)
        if val is None or (isinstance(val, str) and not val.strip()):
            remaining.append(key)
    return remaining

def update_state_from_user_response(state, user_response: str | None):
    """
    Updates a RoadmapState instance from unstructured user input.
    Uses LLM to normalize input into JSON and applies only missing keys.
    """
    if not user_response:
        return state

    # Capture which fields were missing before applying updates
    missing_before = getattr(state, "missing_fields", None) or []

    # Always normalize unstructured input via LLM into strict JSON for the missing keys
    prompt = f"""
You are an assistant helping fill missing fields in a research roadmap state.
The user replied (unstructured):
{user_response}

Missing fields (fill ONLY these keys): {missing_before}

Return STRICT JSON only. Do not add commentary. Keys must match exactly.
"""
    response = call_llm(prompt)
    updates: Dict[str, Any] = {}

    try:
        cleaned_llm = _extract_json_string(response)
        parsed_llm = json.loads(cleaned_llm)
        if isinstance(parsed_llm, dict):
            updates = parsed_llm
    except Exception:
        # As a fallback, try simple key:value parsing from the user's raw input
        updates = _parse_kv_fallback(user_response)

    # Apply updates to state
    for key, val in updates.items():
        setattr(state, key, val)

    # Recalculate remaining missing based on what was previously missing
    remaining = _remaining_missing(state, missing_before)
    state.missing_fields = remaining if remaining else None

    # Clear consumed user_input to avoid re-looping without new info
    setattr(state, "user_input", None)

    return state
