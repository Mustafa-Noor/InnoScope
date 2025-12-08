import requests
import re
from typing import Dict, List, Optional

DDG_API = "https://api.duckduckgo.com/"
HEADERS = {"User-Agent": "InnoScope/1.0 (contact: you@example.com) Python-requests"}


def ddg_search(query: str) -> Dict:
    """Raw DuckDuckGo Instant Answer API call (no HTML, no redirects)."""
    params = {
        "q": query,
        "format": "json",
        "no_redirect": "1",
        "no_html": "1",
    }
    try:
        resp = requests.get(DDG_API, params=params, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        # Handle empty response body
        if not resp.text:
            return {}
        return resp.json()
    except (requests.exceptions.RequestException, ValueError) as e:
        # If request fails or response isn't valid JSON, return empty dict
        return {}


def _extract_text_items(data: Dict) -> List[str]:
    """Flatten RelatedTopics and Abstract into a list of text snippets."""
    items: List[str] = []
    abstract = data.get("Abstract")
    if abstract:
        items.append(abstract.strip())
    for rt in data.get("RelatedTopics", []):
        # RelatedTopics entries can contain nested topics under 'Topics'
        if isinstance(rt, dict):
            if "Text" in rt and rt["Text"]:
                items.append(rt["Text"].strip())
            # Nested Topics list
            for sub in rt.get("Topics", []) or []:
                if isinstance(sub, dict) and sub.get("Text"):
                    items.append(sub["Text"].strip())
    # De-duplicate preserving order
    seen = set()
    deduped = []
    for x in items:
        if x not in seen:
            deduped.append(x)
            seen.add(x)
    return deduped


def gather_ddg_supporting_text(
    problem_statement: Optional[str],
    domain: Optional[str],
    goals: Optional[List[str]],
    prerequisites: Optional[List[str]],
    key_topics: Optional[List[str]],
    max_topic_queries: int = 5,
) -> Dict[str, List[str]]:
    """Given existing research fields, query DuckDuckGo to gather contextual snippets.

    Strategy:
      - Domain: single query; take top snippets.
      - Problem: use domain + 'challenge' if problem_statement absent.
      - Goals: each goal phrase used as a query (limited) to extract improvement-oriented snippets.
      - Prerequisites: query domain + 'requirements' + each prerequisite term.
      - Key topics: query each topic individually (limited).

    Returns dict with lists of snippets. Falls back to original field values if empty.
    """
    results: Dict[str, List[str]] = {
        "domain_context": [],
        "problem_context": [],
        "goals_context": [],
        "prerequisites_context": [],
        "key_topics_context": [],
    }

    # Helper to filter sentences by a regex
    def filter_snippets(snippets: List[str], pattern: re.Pattern, limit: int) -> List[str]:
        out = []
        for s in snippets:
            if pattern.search(s):
                out.append(s)
            if len(out) >= limit:
                break
        return out

    # Domain context
    if domain:
        domain_data = ddg_search(domain)
        domain_snips = _extract_text_items(domain_data)
        results["domain_context"] = domain_snips[:8]

    # Problem context
    if problem_statement:
        # Query a condensed form (take first 12 words) to avoid overly long queries
        short_prob = " ".join(problem_statement.split()[:12])
        prob_data = ddg_search(short_prob)
        prob_snips = _extract_text_items(prob_data)
        challenge_re = re.compile(r"\b(challenge|problem|need|issue|barrier|gap)\b", re.IGNORECASE)
        filtered_prob = filter_snippets(prob_snips, challenge_re, 8)
        results["problem_context"] = filtered_prob or prob_snips[:5]
    elif domain:
        prob_data = ddg_search(f"{domain} challenge")
        prob_snips = _extract_text_items(prob_data)
        results["problem_context"] = prob_snips[:5]

    # Goals context
    if goals:
        improve_re = re.compile(r"\b(improve|enhance|increase|reduce|streamline|optimi[sz]e|enable|advance)\b", re.IGNORECASE)
        for g in goals[:6]:
            g_data = ddg_search(g)
            g_snips = _extract_text_items(g_data)
            filtered = filter_snippets(g_snips, improve_re, 4)
            (results["goals_context"].extend(filtered or g_snips[:2]))
            if len(results["goals_context"]) >= 15:
                break

    # Prerequisites context
    if prerequisites:
        prereq_re = re.compile(r"\b(require|prerequisite|need|necessary|depend|necessitate)\b", re.IGNORECASE)
        for p in prerequisites[:6]:
            p_query = p if len(p.split()) < 6 else " ".join(p.split()[:6])
            p_data = ddg_search(p_query)
            p_snips = _extract_text_items(p_data)
            filtered = filter_snippets(p_snips, prereq_re, 4)
            results["prerequisites_context"].extend(filtered or p_snips[:2])
            if len(results["prerequisites_context"]) >= 15:
                break
        # If still empty but domain present try domain + requirements
        if not results["prerequisites_context"] and domain:
            req_data = ddg_search(f"{domain} requirements")
            req_snips = _extract_text_items(req_data)
            results["prerequisites_context"] = req_snips[:6]

    # Key topics context
    if key_topics:
        improvement_re = re.compile(r"\b(improve|enhance|increase|reduce|streamline|advance)\b", re.IGNORECASE)
        for t in key_topics[:max_topic_queries]:
            t_data = ddg_search(t)
            t_snips = _extract_text_items(t_data)
            # pick first 2 + any improvement related
            chosen = t_snips[:2] + filter_snippets(t_snips, improvement_re, 2)
            results["key_topics_context"].extend([f"[{t}] {c}" for c in chosen])
            if len(results["key_topics_context"]) >= 30:
                break

    # Fallbacks: if nothing found, use originals
    if problem_statement and not results["problem_context"]:
        results["problem_context"].append(problem_statement)
    if goals and not results["goals_context"]:
        results["goals_context"].extend(goals[:8])
    if prerequisites and not results["prerequisites_context"]:
        results["prerequisites_context"].extend(prerequisites[:8])
    if key_topics and not results["key_topics_context"]:
        results["key_topics_context"].extend(key_topics[:8])

    return results


if __name__ == "__main__":
    sample = gather_ddg_supporting_text(
        problem_statement="Need to improve diagnostic accuracy in healthcare.",
        domain="Artificial intelligence in healthcare",
        goals=["Improve diagnostic accuracy", "Reduce clinician workload"],
        prerequisites=["High-quality annotated datasets"],
        key_topics=["Medical imaging", "Clinical decision support"],
    )
    import json
    print(json.dumps(sample, indent=2))
