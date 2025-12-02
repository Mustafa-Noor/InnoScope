from app.services.extract_fields import extract_fields_from_summary as llm_extract_fields
from app.schemas.intermediate import IntermediateState


def fill_state_node(state: IntermediateState):
    # Guard: if summary missing or unparsable, skip
    if not state.summary or not isinstance(state.summary, str):
        return state

    data = llm_extract_fields(state.summary)
    if not isinstance(data, dict) or not data:
        return state

    # problem_statement
    state.problem_statement = data.get("problem_statement", state.problem_statement)

    # domain: normalize list -> comma string, strip
    domain_val = data.get("domain", state.domain)
    if isinstance(domain_val, list):
        domain_val = ", ".join([str(x).strip() for x in domain_val if str(x).strip()])
    if isinstance(domain_val, str):
        domain_val = domain_val.strip()
    state.domain = domain_val

    # goals normalization
    goals = data.get("goals", state.goals)
    if isinstance(goals, str):
        goals = [x.strip() for x in goals.split(";") if x.strip()]
        if len(goals) == 1:
            goals = [x.strip() for x in goals[0].split(",") if x.strip()]
    elif isinstance(goals, list):
        goals = [str(x).strip() for x in goals if str(x).strip()]
    state.goals = goals

    # key_topics normalization
    key_topics = data.get("key_topics", state.key_topics)
    if isinstance(key_topics, str):
        key_topics = [x.strip() for x in key_topics.split(";") if x.strip()]
        if len(key_topics) == 1:
            key_topics = [x.strip() for x in key_topics[0].split(",") if x.strip()]
    elif isinstance(key_topics, list):
        key_topics = [str(x).strip() for x in key_topics if str(x).strip()]
    state.key_topics = key_topics

    # prerequisites normalization
    prerequisites = data.get("prerequisites", state.prerequisites)
    if isinstance(prerequisites, str):
        prerequisites = [x.strip() for x in prerequisites.split(";") if x.strip()]
        if len(prerequisites) == 1:
            prerequisites = [x.strip() for x in prerequisites[0].split(",") if x.strip()]
    elif isinstance(prerequisites, list):
        prerequisites = [str(x).strip() for x in prerequisites if str(x).strip()]
    state.prerequisites = prerequisites

    return state