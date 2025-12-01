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


    prompt = f"""


Extract the following from this summary:



Fields:


- problem_statement


- domain


- goals


- key_topics


- prerequisites



Summary:


{summary}



Return strict JSON only.
"""


    response = call_llm(prompt)


    cleaned = _extract_json_string(response)


    try:


        return json.loads(cleaned)


    except Exception:


        return {}




def detect_missing_fields(state: IntermediateState):


    missing = []



    for field in ["problem_statement", "domain", "goals", "key_topics", "prerequisites"]:


        if getattr(state, field) in [None, "", []]:

            missing.append(field)



    state.missing_fields = missing
    return state


