import json
import re

from app.utils.llm import call_llm


from app.schemas.intermediate import IntermediateState




REQUIRED_FIELDS = [


    "problem_statement",
    "domain",
    "goals",


    "key_topics",


    "prerequisites",


]



def _extract_json_string(s: str) -> str:
    if not s:
        return ""


    s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s.strip(), flags=re.MULTILINE)


    m = re.search(r"\{[\s\S]*\}", s)


    return m.group(0) if m else s



def extract_fields_from_summary(summary: str):
    """Extract structured fields from summary text.
    
    Returns a dict with fields: problem_statement, domain, goals (list), 
    key_topics (list), prerequisites (list).
    """
    
    prompt = f"""Extract fields from this summary as JSON. Lists must be arrays.

{{"problem_statement": "...", "domain": "...", "goals": [...], "key_topics": [...], "prerequisites": [...]}}

Summary: {summary[:3000]}

JSON ONLY:"""

    response = call_llm(prompt)
    cleaned = _extract_json_string(response)
    
    try:
        data = json.loads(cleaned)
        
        # Ensure list fields are actually lists
        for list_field in ["goals", "key_topics", "prerequisites"]:
            if list_field in data:
                value = data[list_field]
                # If it's a string, split it or wrap it in a list
                if isinstance(value, str):
                    # Try to split by common delimiters
                    if "," in value:
                        data[list_field] = [item.strip() for item in value.split(",")]
                    elif ";" in value:
                        data[list_field] = [item.strip() for item in value.split(";")]
                    else:
                        # Single item - wrap in list
                        data[list_field] = [value.strip()]
                elif not isinstance(value, list):
                    # Convert to list if not already
                    data[list_field] = [str(value)]
            else:
                # Missing field - ensure it's an empty list
                data[list_field] = []
        
        return data
    except Exception as e:
        print(f"[extract_fields] Error parsing JSON: {e}")
        return {"problem_statement": "", "domain": "", "goals": [], "key_topics": [], "prerequisites": []}




def detect_missing_fields(state: IntermediateState):


    missing = []



    for field in ["problem_statement", "domain", "goals", "key_topics", "prerequisites"]:


        if getattr(state, field) in [None, "", []]:

            missing.append(field)



    state.missing_fields = missing
    return state


