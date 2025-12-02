import re
from app.utils.llm import call_llm


def chat_generate_question_node(state):
    field = (state.missing_fields or [None])[0]
    guide_map = {
        "problem_statement": "Ask for a crisp 1–2 sentence problem statement.",
        "domain": "Ask which domain/industry best describes the project.",
        "goals": "Ask the user to list 3–5 concrete goals (bullets are fine).",
        "prerequisites": "Ask for prerequisites/dependencies like data, tools, approvals, or constraints.",
        "key_topics": "Ask for key topics/technologies (e.g., NLP, IoT, Blockchain).",
    }
    guide = guide_map.get(field, "Ask for the most relevant missing detail.")
    prompt = f"""
You are a helpful scoping assistant.
Given the conversation transcript and the current partial state, ask EXACTLY ONE concise, direct question to elicit the missing field.

Missing field: {field}
Guidance: {guide}

Partial structured state (JSON):
{state.model_dump()}

Conversation transcript:
{getattr(state, 'memory_text', '')}

Rules:
- Output ONLY the question text, no preface or extra lines.
- Keep it under 25 words.
- Do not ask multiple questions; no numbered lists.
- Be specific based on context; avoid generic phrasing.
"""
    q = call_llm(prompt) or ""
    q = re.sub(r"^```(?:.*)\n?|\n?```$", "", (q or "").strip())
    if not q:
        fallback = {
            "problem_statement": "What problem are you trying to solve?",
            "domain": "What is the project's domain or industry?",
            "goals": "What are 3–5 concrete goals for this project?",
            "prerequisites": "What prerequisites or constraints should we note?",
            "key_topics": "Which key topics or technologies are central here?",
        }
        q = fallback.get(field, "Could you share the next key detail?")
    state.reply_text = q
    state.completed = False
    return state
