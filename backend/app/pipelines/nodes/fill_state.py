from app.services.extract_fields import extract_fields_from_summary as llm_extract_fields
from app.schemas.roadmap import RoadmapState

def fill_state_node(state: RoadmapState):
    # Guard: if summary missing or unparsable, skip
    if not state.summary or not isinstance(state.summary, str):
        return state

    data = llm_extract_fields(state.summary)
    if not isinstance(data, dict) or not data:
        return state

    # Safe mappings
    state.problem_statement = data.get("problem_statement", state.problem_statement)
    state.domain = data.get("domain", state.domain)

    goals = data.get("goals", state.goals)
    if isinstance(goals, str):
        goals = [x.strip() for x in goals.split(";") if x.strip()]
        if len(goals) == 1:
            goals = [x.strip() for x in goals[0].split(",") if x.strip()]
    state.goals = goals

    key_topics = data.get("key_topics", state.key_topics)
    if isinstance(key_topics, str):
        key_topics = [x.strip() for x in key_topics.split(";") if x.strip()]
        if len(key_topics) == 1:
            key_topics = [x.strip() for x in key_topics[0].split(",") if x.strip()]
    state.key_topics = key_topics

    prerequisites = data.get("prerequisites", state.prerequisites)
    if isinstance(prerequisites, str):
        prerequisites = [x.strip() for x in prerequisites.split(";") if x.strip()]
        if len(prerequisites) == 1:
            prerequisites = [x.strip() for x in prerequisites[0].split(",") if x.strip()]
    state.prerequisites = prerequisites
    return state