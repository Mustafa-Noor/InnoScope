import re
from app.utils.llm import call_llm
from app.schemas.feasibility import FeasibilitySubScore


def assess_technical_feasibility_node(state):
    """Assess technical feasibility of the project."""
    print("[Feasibility] Assessing technical feasibility...")
    
    prompt = f"""You are a technical expert. Quickly assess technical feasibility (0-100).

Project: {state.refined_summary[:300]}
Topics: {', '.join(state.key_topics) if state.key_topics else 'N/A'}

Rate: Tech stack maturity, integration complexity, data needs.

JSON:
{{"score": <0-100>, "explanation": "<1-2 sentences>", "recommendation": "<1 sentence>"}}"""
    
    raw = call_llm(prompt)
    if not raw:
        print("[Feasibility] LLM failed for technical assessment - skipping")
        return state
    
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
    
    try:
        import json
        # # Extract only the first JSON object if multiple exist
        # json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', raw)
        # if json_match:
        #     raw = json_match.group(0)
        data = json.loads(raw)
        state.technical_feasibility = FeasibilitySubScore(
            score=int(data.get("score", 0)),
            explanation=str(data.get("explanation", "Unable to assess")),
            recommendation=str(data.get("recommendation", ""))
        )
    except Exception as e:
        print(f"[Feasibility] Error parsing technical assessment: {e}")
        raise
    
    return state


def assess_resource_feasibility_node(state):
    """Assess resource feasibility (budget, infrastructure, tools)."""
    print("[Feasibility] Assessing resource feasibility...")
    
    prompt = f"""You are a resource planner. Quickly assess resource feasibility (0-100).

Project: {state.refined_summary[:300]}
Domain: {state.domain}

Rate: Budget needs, infrastructure, licenses, tools availability.

JSON:
{{"score": <0-100>, "explanation": "<1-2 sentences>", "recommendation": "<1 sentence>"}}"""
    
    raw = call_llm(prompt)
    if not raw:
        print("[Feasibility] LLM failed for resource assessment - skipping")
        return state
    
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
    
    try:
        import json
        # # Extract only the first JSON object if multiple exist
        # json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', raw)
        # if json_match:
        #     raw = json_match.group(0)
        data = json.loads(raw)
        state.resource_feasibility = FeasibilitySubScore(
            score=int(data.get("score", 0)),
            explanation=str(data.get("explanation", "Unable to assess")),
            recommendation=str(data.get("recommendation", ""))
        )
    except Exception as e:
        print(f"[Feasibility] Error parsing resource assessment: {e}")
        raise
    
    return state


def assess_skills_feasibility_node(state):
    """Assess skills and team capability feasibility."""
    print("[Feasibility] Assessing skills feasibility...")
    
    prompt = f"""You are a talent manager. Quickly assess skills feasibility (0-100).

Project: {state.refined_summary[:300]}
Topics: {', '.join(state.key_topics) if state.key_topics else 'N/A'}

Rate: Required expertise, learning curve, team gaps.

JSON:
{{"score": <0-100>, "explanation": "<1-2 sentences>", "recommendation": "<1 sentence>"}}"""
    
    raw = call_llm(prompt)
    if not raw:
        print("[Feasibility] LLM failed for skills assessment - skipping")
        return state
    
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
    
    try:
        import json
        # # Extract only the first JSON object if multiple exist
        # json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', raw)
        # if json_match:
        #     raw = json_match.group(0)
        data = json.loads(raw)
        state.skills_feasibility = FeasibilitySubScore(
            score=int(data.get("score", 0)),
            explanation=str(data.get("explanation", "Unable to assess")),
            recommendation=str(data.get("recommendation", ""))
        )
    except Exception as e:
        print(f"[Feasibility] Error parsing skills assessment: {e}")
        raise
    
    return state


def assess_scope_feasibility_node(state):
    """Assess scope and timeline feasibility."""
    print("[Feasibility] Assessing scope feasibility...")
    
    prompt = f"""You are a project manager. Quickly assess scope feasibility (0-100).

Project: {state.refined_summary[:300]}
Problem: {state.problem_statement}

Rate: Scope clarity, complexity, timeline realism, scope creep risk.

JSON:
{{"score": <0-100>, "explanation": "<1-2 sentences>", "recommendation": "<1 sentence>"}}"""
    
    raw = call_llm(prompt)
    if not raw:
        print("[Feasibility] LLM failed for scope assessment - skipping")
        return state
    
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
    
    try:
        import json
        # # Extract only the first JSON object if multiple exist
        # json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', raw)
        # if json_match:
        #     raw = json_match.group(0)
        data = json.loads(raw)
        state.scope_feasibility = FeasibilitySubScore(
            score=int(data.get("score", 0)),
            explanation=str(data.get("explanation", "Unable to assess")),
            recommendation=str(data.get("recommendation", ""))
        )
    except Exception as e:
        print(f"[Feasibility] Error parsing scope assessment: {e}")
        raise
    
    return state


def assess_risk_feasibility_node(state):
    """Assess risk and mitigation feasibility."""
    print("[Feasibility] Assessing risk feasibility...")
    
    prompt = f"""You are a risk analyst. Quickly assess risk feasibility (0-100).

Project: {state.refined_summary[:300]}
Topics: {', '.join(state.key_topics) if state.key_topics else 'N/A'}

Rate: Identified risks, dependencies, external volatility, mitigation strategies.

JSON:
{{"score": <0-100>, "explanation": "<1-2 sentences>", "recommendation": "<1 sentence>"}}"""
    
    raw = call_llm(prompt)
    if not raw:
        print("[Feasibility] LLM failed for risk assessment - skipping")
        return state
    
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
    
    try:
        import json
        # # Extract only the first JSON object if multiple exist
        # json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', raw)
        # if json_match:
        #     raw = json_match.group(0)
        data = json.loads(raw)
        state.risk_feasibility = FeasibilitySubScore(
            score=int(data.get("score", 0)),
            explanation=str(data.get("explanation", "Unable to assess")),
            recommendation=str(data.get("recommendation", ""))
        )
    except Exception as e:
        print(f"[Feasibility] Error parsing risk assessment: {e}")
        raise
    
    return state
