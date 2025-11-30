import json
import re

def _extract_json_string(s: str) -> str:
    if not s:
        return ""
    # Strip ```json ... ``` or ``` ... ``` fences
    s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s.strip(), flags=re.MULTILINE)
    # If JSON is embedded in text, capture first {...} block
    m = re.search(r"\{[\s\S]*\}", s)
    if m:
        return m.group(0)
    return s

def extract_fields_from_summary(response: str) -> dict:
    """
    Accepts LLM output that may include markdown and returns a dict.
    """
    if not response or not isinstance(response, str):
        return {}
    # Try strict JSON first after cleaning
    cleaned = _extract_json_string(response)
    try:
        return json.loads(cleaned)
    except Exception:
        # Fallback: try to coerce common arrays/strings from naive key:value lines
        data = {}
        for line in response.splitlines():
            if ":" in line and not line.strip().startswith("#"):
                k, v = line.split(":", 1)
                data[k.strip()] = v.strip().strip(",")
        return data