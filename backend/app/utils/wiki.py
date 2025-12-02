import requests
import re
from typing import List, Dict, Optional

API_URL = "https://en.wikipedia.org/w/api.php"
HEADERS = {
	"User-Agent": "InnoScope/1.0 (contact: you@example.com) Python-requests",
	"Accept-Language": "en",
}

def _fetch_plain_page(title: str) -> Optional[str]:
	"""Return full plain text extract for a title or None."""
	params = {
		"action": "query",
		"prop": "extracts",
		"explaintext": True,
		"titles": title,
		"format": "json",
		"redirects": 1,
	}
	resp = requests.get(API_URL, params=params, headers=HEADERS, timeout=25)
	if resp.status_code == 403:
		# polite retry
		resp = requests.get(API_URL, params=params, headers=HEADERS, timeout=25)
	try:
		resp.raise_for_status()
	except Exception:
		return None
	data = resp.json()
	pages = data.get("query", {}).get("pages", {})
	if not pages:
		return None
	page = next(iter(pages.values()))
	if "missing" in page:
		return None
	return page.get("extract") or ""

def _split_sentences(text: str) -> List[str]:
	return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]

def gather_wiki_supporting_text(
	problem_statement: Optional[str],
	domain: Optional[str],
	goals: Optional[List[str]],
	prerequisites: Optional[List[str]],
	key_topics: Optional[List[str]],
	max_topic_pages: int = 5,
) -> Dict[str, List[str]]:
	"""Given existing research fields, fetch Wikipedia context snippets.

	Returns dict with lists of sentences supporting each field:
	  - domain_context
	  - problem_context
	  - goals_context
	  - prerequisites_context
	  - key_topics_context (topic -> sentences)
	"""
	results: Dict[str, List[str]] = {
		"domain_context": [],
		"problem_context": [],
		"goals_context": [],
		"prerequisites_context": [],
		"key_topics_context": [],
	}

	# Fetch domain page if domain exists
	domain_text = _fetch_plain_page(domain) if domain else None
	if domain_text:
		sentences = _split_sentences(domain_text)
		# Domain context: first 5 sentences
		results["domain_context"] = sentences[:5]
		# Problem context: sentences containing challenge keywords
		prob_kw = re.compile(r"\b(challenge|problem|need|issue|gap|barrier)\b", re.IGNORECASE)
		results["problem_context"] = [s for s in sentences if prob_kw.search(s)][:5]
		# Goals context: sentences containing verbs of improvement
		goal_kw = re.compile(r"\b(improve|enhance|increase|reduce|streamline|optimi[sz]e|accelerate|enable|advance)\b", re.IGNORECASE)
		results["goals_context"] = [s for s in sentences if goal_kw.search(s)][:8]
		# Prerequisites context: sentences referencing requirements
		prereq_kw = re.compile(r"\b(require(?:s|d)?|prerequisite|need(?:ed|s)?|necessitate|depend(s|ed)?\b)", re.IGNORECASE)
		results["prerequisites_context"] = [s for s in sentences if prereq_kw.search(s)][:8]

	# Key topics pages - fetch limited number
	topic_snippets: List[str] = []
	if key_topics:
		for topic in key_topics[:max_topic_pages]:
			page_text = _fetch_plain_page(topic)
			if not page_text:
				continue
			t_sentences = _split_sentences(page_text)
			# Collect first 3 sentences + any with improvement verbs
			improvement = re.compile(r"\b(improve|enhance|increase|reduce|streamline|optimi[sz]e|enable)\b", re.IGNORECASE)
			chosen = t_sentences[:3] + [s for s in t_sentences if improvement.search(s)][:2]
			topic_snippets.extend([f"[{topic}] {s}" for s in chosen])
			if len(topic_snippets) >= 25:
				break
	results["key_topics_context"] = topic_snippets

	# If problem_context empty but problem_statement provided, include it as fallback
	if problem_statement and not results["problem_context"]:
		results["problem_context"].append(problem_statement)

	# If goals_context empty and goals provided, include goals as fallback
	if goals and not results["goals_context"]:
		results["goals_context"].extend(goals[:8])

	# If prerequisites_context empty and prerequisites provided, include them
	if prerequisites and not results["prerequisites_context"]:
		results["prerequisites_context"].extend(prerequisites[:8])

	return results

# if __name__ == "__main__":
# 	# Simple manual test
# 	sample = gather_wiki_supporting_text(
# 		problem_statement="Need to improve diagnostic accuracy in healthcare.",
# 		domain="Artificial intelligence in healthcare",
# 		goals=["Improve diagnostic accuracy", "Reduce clinician workload"],
# 		prerequisites=["High-quality annotated datasets"],
# 		key_topics=["Medical imaging", "Clinical decision support"],
# 	)
# 	import json
# 	print(json.dumps(sample, indent=2))
