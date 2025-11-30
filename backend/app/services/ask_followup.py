from app.schemas.roadmap import RoadmapState
from app.services.extract_fields import extract_fields_from_summary

def ask_followup_questions(state: RoadmapState):
    # If nothing is missing, proceed
    if not state.missing_fields:
        return {"next": "generate_roadmap"}

    # If we have not asked yet and there's a summary, try auto-fill once
    # This helps when the LLM can infer fields directly without user input.
    if state.followup_attempts == 0 and state.summary:
        data = extract_fields_from_summary(state.summary)
        if isinstance(data, dict) and data:
            # Apply any fields we can infer
            state.problem_statement = data.get("problem_statement", state.problem_statement)
            state.domain = data.get("domain", state.domain)
            state.goals = data.get("goals", state.goals)
            state.key_topics = data.get("key_topics", state.key_topics)
            state.prerequisites = data.get("prerequisites", state.prerequisites)

    # Recompute missing after potential auto-fill
    still_missing = []
    for key in ["problem_statement", "domain", "goals", "key_topics", "prerequisites"]:
        val = getattr(state, key, None)
        if val in [None, "", []]:
            still_missing.append(key)
    state.missing_fields = still_missing

    # If still missing but we reached question cap, proceed without more asks
    if state.followup_attempts >= 2:
        return {
            "next": "generate_roadmap",
            "note": "Question limit reached"
        }

    # If still missing and user_input exists, we'll ask targeted question
    if state.missing_fields:
        missing = ", ".join(state.missing_fields)
        question = (
            f"To complete your research roadmap, please provide: {missing}. "
            f"You can reply in JSON or simple 'key: value' lines."
        )
        state.last_question = question
        state.followup_attempts += 1
        return {"ask_user": question}

    # No longer missing
    return {"next": "generate_roadmap"}