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
    Generate a structured roadmap using highest-fidelity input only.

    Priority order: llm_report (already synthesized) > consolidated > summary.
    Optimized for token efficiency by using only primary input.
    Enforces canonical headings and structured subsections.
    """

    # Use only the highest-fidelity available source (llm_report already synthesized)
    primary = llm_report or consolidated or summary or "(no context)"
    
    # Token-optimized prompt: remove redundant context layers
    prompt = (
        "You are an expert product strategist.\n"
        "Create a structured, actionable roadmap based on the research below.\n\n"
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
        "RESEARCH CONTENT:\n"
        f"{primary}\n\n"
        "Return ONLY the roadmap with the exact headings and subsections."
    )

    # Call LLM and return as-is (no skeleton fallbacks)
    response = call_llm(prompt) or ""
    text = response.strip()
    return text
