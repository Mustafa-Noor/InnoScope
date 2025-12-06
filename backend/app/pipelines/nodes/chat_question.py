import re
from app.utils.llm import call_llm


def chat_generate_question_node(state):
    missing_fields = list(state.missing_fields or [])
    pairs = getattr(state, "message_pairs", 0) or 0
    attempt = max(1, min(3, pairs))

    hints = {
        "problem_statement": "1–2 sentences describing the core problem.",
        "domain": "Domain/industry (e.g., FinTech, Healthcare, EdTech).",
        "goals": "3–5 concrete goals (bullets ok).",
        "prerequisites": "Dependencies/constraints (data, tools, approvals, risks).",
        "key_topics": "Key topics/tech (e.g., NLP, IoT, LLMs, Blockchain).",
        "additional_context": "Any constraints, stakeholders, metrics, timeline, scope, or risks.",
    }

    style_variants = {
        1: "Be friendly and concise. Use a compact bullet list.",
        2: "Rephrase more specifically. Include tiny inline examples.",
        3: "Final pass. Offer a quick fill-in template the user can copy/paste.",
    }

    # Build checklist
    checklist_lines = []
    for f in missing_fields:
        label = f.replace("_", " ").title()
        hint = hints.get(f, "Key details.")
        checklist_lines.append(f"- {label}: {hint}")

    checklist = (
        "\n".join(checklist_lines)
        if checklist_lines
        else "- Additional context: Anything else we should consider."
    )

    # Optional template
    template = (
        "Problem Statement: ...\n"
        "Domain: ...\n"
        "Goals:\n- ...\n- ...\n- ...\n"
        "Prerequisites:\n- ...\n- ...\n"
        "Key Topics:\n- ...\n- ...\n"
    )
    extra_template = ""
    if attempt == 3:
        extra_template = "Add a short, copy/paste template after the bullets like this:\n\n" + template

    prompt = (
    "You are a helpful scoping assistant.\n"
    "Given the transcript and current partial state, ask the user for ALL missing details in ONE consolidated message.\n\n"
    f"Missing fields: {missing_fields}\n"
    "Partial structured state (JSON):\n"
    f"{state.model_dump()}\n\n"
    "Conversation transcript:\n"
    f"{getattr(state, 'memory_text', '')}\n\n"
    "Guidance:\n"
    f"- {style_variants[attempt]}\n"
    "- Keep it compact and actionable.\n"
    "- If the user says they don't know, we will proceed with reasonable assumptions.\n"
    "- Avoid prefaces like \"Sure\" or \"I can help\"; output only the message for the user.\n"
    "- Prefer bullets and labels over prose.\n\n"
    "Checklist to cover:\n"
    f"{checklist}\n\n"
    f"{extra_template}"
)

    q = call_llm(prompt) or ""
    q = re.sub(r"^```(?:.*)\n?|\n?```$", "", q.strip())

    if not q:
        header = "To proceed quickly, please share the following (if unsure, say 'assume'):\n"
        q = header + checklist
        if attempt == 3:
            q += "\n\nTemplate:\n" + template

    state.reply_text = q
    state.completed = False
    return state
