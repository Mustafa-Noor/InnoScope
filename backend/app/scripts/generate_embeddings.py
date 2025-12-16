import requests
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
import google.generativeai as genai
import uuid
import xml.etree.ElementTree as ET
from app.config import settings

# --------------------------
# CONFIG
# --------------------------
QDRANT_URL = "https://306b40eb-c48e-4984-9ef0-38f123414040.europe-west3-0.gcp.cloud.qdrant.io:6333"
QDRANT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.kHg0fw3Pl7HGRUoN5q8YHaQlsOsCQaaR4sUuYp1U73w"
GEMINI_API_KEY = settings.GOOGLE_API_KEY
COLLECTION_NAME = "feasibility_papers"

# Feasibility-focused keywords
FEASIBILITY_KEYWORDS = [
    "feasibility", "deployment", "scalability", "limitations",
    "system design", "resource", "constraints", "evaluation",
    "performance", "benchmark", "robustness", "cost", "efficiency",
    "engineering", "experiments", "implementation", "practical"
]

# Feasibility-heavy arXiv categories
ARXIV_CATEGORIES = [
    "cs.SE", "cs.LG", "cs.AI", "cs.CV",
    "cs.CL", "cs.IR", "cs.RO", "cs.CY", "cs.DC"
]


# --------------------------
# INIT CLIENTS
# --------------------------
genai.configure(api_key=GEMINI_API_KEY)
client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_KEY, timeout=30)
embedding_model = "models/text-embedding-004"


# --------------------------
# INIT COLLECTION
# --------------------------
def init_collection():
    try:
        collections = client.get_collections().collections
        if not any(c.name == COLLECTION_NAME for c in collections):
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=768, distance=Distance.COSINE)
            )
            print(f"Created collection: {COLLECTION_NAME}")
        else:
            print(f"Collection {COLLECTION_NAME} already exists.")
    except Exception as e:
        print(f"Warning: Could not check existing collections ({e}). Attempting to create...")
        try:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=768, distance=Distance.COSINE)
            )
            print(f"Created collection: {COLLECTION_NAME}")
        except Exception as create_error:
            print(f"Error creating collection: {create_error}")
            raise


# --------------------------
# EMBEDDING GENERATOR
# --------------------------
def embed_text(text):
    res = genai.embed_content(model=embedding_model, content=text)
    return res["embedding"]


# --------------------------
# FETCH FROM ARXIV (with category loop)
# --------------------------
def fetch_arxiv(category, max_results=50):
    import time

    url = (
        f"https://export.arxiv.org/api/query?"
        f"search_query=cat:{category}&start=0&max_results={max_results}"
    )

    for attempt in range(3):
        try:
            print(f"  Attempting to fetch from: {url}")
            r = requests.get(
                url,
                timeout=15,
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; FeasibilityBot/1.0)"
                }
            )

            print(f"  Status code: {r.status_code}")
            
            if r.status_code == 200:
                if len(r.text) == 0:
                    print(f"  Empty response received. Retrying...")
                    time.sleep(3)
                    continue
                return r.text

            if r.status_code == 429:
                print(f"  Rate limited. Waiting 5 seconds ({attempt+1}/3)...")
                time.sleep(5)
                continue

            print(f"  Unexpected HTTP {r.status_code}. Response: {r.text[:100]}")
            time.sleep(2)

        except requests.RequestException as e:
            print(f"  Request error on attempt {attempt+1}: {e}")
            time.sleep(2)

    raise Exception(f"arXiv fetch failed after 3 attempts for category {category}")



# --------------------------
# PARSE ARXIV XML
# --------------------------
def parse_arxiv(feed):
    if not feed or len(feed.strip()) == 0:
        print("  Warning: Empty feed received")
        return []
    
    try:
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        root = ET.fromstring(feed)
        papers = []

        for entry in root.findall("atom:entry", ns):
            try:
                title_elem = entry.find("atom:title", ns)
                summary_elem = entry.find("atom:summary", ns)
                link_elem = entry.find("atom:id", ns)
                
                if title_elem is not None and summary_elem is not None and link_elem is not None:
                    title = title_elem.text.strip()
                    summary = summary_elem.text.strip()
                    link = link_elem.text.strip()

                    papers.append({
                        "title": title,
                        "summary": summary,
                        "link": link
                    })
            except Exception as e:
                print(f"  Warning: Could not parse entry: {e}")
                continue
        
        return papers
    except ET.ParseError as e:
        print(f"  XML Parse Error: {e}")
        print(f"  Feed preview: {feed[:300]}")
        return []


# --------------------------
# FILTER Feasibility-Relevant Papers
# --------------------------
def is_feasibility_related(paper):
    text = (paper["title"] + " " + paper["summary"]).lower()
    return any(kw in text for kw in FEASIBILITY_KEYWORDS)


# --------------------------
# STORE EMBEDDINGS
# --------------------------
def store_papers(papers):
    points = []
    for paper in papers:
        doc = f"{paper['title']}\n\n{paper['summary']}"
        vector = embed_text(doc)

        p = PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload=paper
        )
        points.append(p)

    client.upsert(collection_name=COLLECTION_NAME, points=points)
    print(f"Inserted {len(points)} papers")


# --------------------------
# MAIN PIPELINE
# --------------------------
if __name__ == "__main__":
    import time
    
    init_collection()

    all_valid_papers = []

    for cat in ARXIV_CATEGORIES:
        print(f"Fetching {cat}...")
        try:
            feed = fetch_arxiv(cat, max_results=40)
            papers = parse_arxiv(feed)

            filtered = [p for p in papers if is_feasibility_related(p)]
            print(f"  Matched {len(filtered)} feasibility papers in {cat}")

            all_valid_papers.extend(filtered)
            
            # Be respectful to arXiv API - wait between requests
            time.sleep(2)
        except Exception as e:
            print(f"  Error fetching {cat}: {e}")
            continue

    print(f"\nTotal feasibility papers found: {len(all_valid_papers)}")

    if all_valid_papers:
        store_papers(all_valid_papers)
    else:
        print("No papers found. Skipping storage.")

    print("Done.")
