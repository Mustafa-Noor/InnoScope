from app.utils.llm import call_llm
import re

HEADINGS = [
    "1. Prototype Development",
    "2. Testing & Validation",
    "3. Funding & Grants",
    "4. Manufacturing / Implementation",
    "5. Marketing & Promotion",
    "6. Launch / Deployment",
    "7. Maintenance & Iteration",
    "8. Scaling & Expansion",
]


def generate_roadmap(
    llm_report: str | None,
    consolidated: str | None,
    summary: str | None,
) -> str:
    """
    Generate a structured roadmap using layered research inputs.

    Priority order: llm_report > consolidated > summary.
    All layers still included for context.
    Enforces canonical headings and structured subsections.
    """

    # Build stacked context
    blocks = []
    if llm_report:
        blocks.append("[LLM_REPORT]\n" + llm_report.strip())
    if consolidated:
        blocks.append("[CONSOLIDATED]\n" + consolidated.strip())
    if summary:
        blocks.append("[SUMMARY]\n" + summary.strip())

    combined_context = "\n\n".join(blocks) or "(no context)"
    primary = llm_report or consolidated or summary or "(no primary content)"

    # -------------------------
    #    FIXED + CLEAN PROMPT
    # -------------------------
    prompt = (
        "You are an expert product strategist.\n"
        "Create a structured, actionable roadmap based on the research layers below.\n\n"
        "STRICT REQUIREMENTS:\n"
        "- Preserve EXACT headings (do not rename, reorder, add or remove):\n"
        f"{chr(10).join(HEADINGS)}\n\n"
        "For each heading include EXACT subsections in this order:\n"
        "  Objective: one concise sentence\n"
        "  Key Actions:\n"
        "    - 3–6 bullets starting with strong verbs\n"
        "  Metrics:\n"
        "    - 2–4 measurable indicators\n"
        "  Risks & Mitigations:\n"
        "    - 1–3 bullets formatted \"Risk: ... | Mitigation: ...\"\n\n"
        "No added headings. If a subsection lacks data, produce a realistic placeholder.\n\n"
        "PRIMARY (highest-fidelity) CONTENT:\n"
        f"{primary}\n\n"
        "ADDITIONAL CONTEXT LAYERS MERGED:\n"
        f"{combined_context}\n\n"
        "Return ONLY the roadmap with the exact headings and subsections."
    )

    # Call LLM and return as-is (no skeleton fallbacks)
    response = call_llm(prompt) or ""
    text = response.strip()
    return text
