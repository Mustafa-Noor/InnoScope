from utils.llm import call_llm

def generate_roadmap(summary):
    prompt = f"""
    You are an expert AI advisor. Based on the following research summary, create a **structured, actionable roadmap** 
    for turning the research into a real-world product or project. Include **all major steps** with headings 
    and short explanations. Use the following steps as a template:

    1. Prototype Development
    2. Testing & Validation
    3. Funding & Grants
    4. Manufacturing / Implementation
    5. Marketing & Promotion
    6. Launch / Deployment
    7. Maintenance & Iteration
    8. Scaling & Expansion

    Make sure each step is tailored to the research summary provided and contains specific guidance or actions. 
    Organize your output clearly with headings and bullet points if needed.

    Research Summary:
    {summary}
    """

    response = call_llm(prompt)
    return response