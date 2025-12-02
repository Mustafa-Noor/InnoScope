import re
from app.utils.llm import call_llm


def chat_generate_question_node(state):
    missing_fields = list(state.missing_fields or [])
    # Derive attempt level from conversation depth (1..3)
    pairs = getattr(state, 'message_pairs', 0) or 0
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

    # Build a compact checklist for all missing fields
    checklist_lines = []
    for f in missing_fields:
        label = f.replace('_', ' ').title()
        hint = hints.get(f, "Key details.")
        checklist_lines.append(f"- {label}: {hint}")
    checklist = "\n".join(checklist_lines) if checklist_lines else "- Additional context: Anything else we should consider."

    # Optional template for attempt 3
    template = (
        "Problem Statement: ...\n"
        "Domain: ...\n"
        "Goals:\n- ...\n- ...\n- ...\n"
        "Prerequisites:\n- ...\n- ...\n"
        "Key Topics:\n- ...\n- ...\n"
    )

    prompt = f"""
You are a helpful scoping assistant.
Given the transcript and current partial state, ask the user for ALL missing details in ONE consolidated message.

Missing fields: {missing_fields}
Partial structured state (JSON):
{state.model_dump()}

Conversation transcript:
{getattr(state, 'memory_text', '')}

Guidance:
- {style_variants[attempt]}
- Keep it compact and actionable.
- If the user says they don't know, we will proceed with reasonable assumptions.
- Avoid prefaces like "Sure" or "I can help"; output only the message for the user.
- Prefer bullets and labels over prose.

Checklist to cover:
{checklist}

{"Add a short, copy/paste template after the bullets like this:\n\n" + template if attempt == 3 else ""}
"""

    q = call_llm(prompt) or ""
    q = re.sub(r"^```(?:.*)\n?|\n?```$", "", (q or "").strip())
    if not q:
        # Fallback deterministic message
        header = "To proceed quickly, please share the following (if unsure, say 'assume'):\n"
        q = header + checklist
        if attempt == 3:
            q += "\n\nTemplate:\n" + template

    state.reply_text = q
    state.completed = False
    return state
