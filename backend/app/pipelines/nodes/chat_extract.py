import re
import json
from typing import Any, List
from app.utils.llm import call_llm


def _as_list(v: Any) -> List[str]:
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    if isinstance(v, str):
        parts = [p.strip() for p in re.split(r"[\n,]", v) if p.strip()]
        return parts
    return []


def chat_extract_fields_node(state):
    """Extract structured fields from conversational memory in `state.memory_text`."""
    memory_text = getattr(state, "memory_text", None) or ""
    prompt = f"""
You are extracting project scoping fields from a conversation transcript.

Return STRICT JSON with exactly these keys:
- problem_statement: string or null
- domain: string or null
- goals: array of strings or []
- prerequisites: array of strings or []
- key_topics: array of strings or []

Transcript:
{memory_text}

JSON only:
"""
    raw = call_llm(prompt) or "{}"
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
    m = re.search(r"\{[\s\S]*\}", raw)
    raw_json = m.group(0) if m else raw
    try:
        data = json.loads(raw_json)
    except Exception:
        data = {}

    state.problem_statement = (data.get("problem_statement") or None) if isinstance(data.get("problem_statement"), str) else (str(data.get("problem_statement")) if data.get("problem_statement") not in [None, ""] else None)
    state.domain = (data.get("domain") or None) if isinstance(data.get("domain"), str) else (str(data.get("domain")) if data.get("domain") not in [None, ""] else None)
    state.goals = _as_list(data.get("goals"))
    state.prerequisites = _as_list(data.get("prerequisites"))
    state.key_topics = _as_list(data.get("key_topics"))
    return state
