from app.services.ask_followup import ask_followup_questions

def ask_for_missing_node(state):
    # Do not increment here; ask_followup_questions manages attempts.
    return ask_followup_questions(state)