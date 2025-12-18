"""
Semantic search service using Qdrant to find relevant papers.
"""

import logging
from typing import List, Optional

import google.generativeai as genai
from qdrant_client import QdrantClient

from app.config import settings
from app.schemas.feasibility_new import RelevantPaper, StructuredFeasibilityInput

logger = logging.getLogger(__name__)


class SemanticSearchService:
    """Search for relevant research papers using vector embeddings."""

    def __init__(self):
        self.client = None
        self.embedding_model = "models/text-embedding-004"
        self.collection_name = "feasibility_papers"
        self.initialize_client()

    def initialize_client(self):
        """Initialize Qdrant client."""
        try:
            qdrant_url = "https://306b40eb-c48e-4984-9ef0-38f123414040.europe-west3-0.gcp.cloud.qdrant.io:6333"
            qdrant_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.kHg0fw3Pl7HGRUoN5q8YHaQlsOsCQaaR4sUuYp1U73w"

            self.client = QdrantClient(
                url=qdrant_url,
                api_key=qdrant_key,
                timeout=30,
                check_compatibility=False,
            )
            logger.info("Qdrant client initialized successfully")

        except Exception as e:
            logger.error(f"Error initializing Qdrant client: {e}")
            self.client = None

    def embed_text(self, text: str) -> Optional[List[float]]:
        """Generate embedding for text using Gemini."""
        try:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            res = genai.embed_content(
                model=self.embedding_model,
                content=text,
            )
            return res["embedding"]

        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return None

    def search_papers(
        self,
        input_data: StructuredFeasibilityInput,
        top_k: int = 5,
    ) -> List[RelevantPaper]:
        """
        Search for papers relevant to the project.
        """
        if self.client is None:
            logger.warning("Qdrant client not available.")
            return []

        try:
            search_query = self._create_search_query(input_data)
            logger.info(f"Search query: {search_query[:100]}...")

            query_embedding = self.embed_text(search_query)
            if not query_embedding:
                return []

            results = self.client.query_points(
                collection_name=self.collection_name,
                query=query_embedding,
                limit=top_k,
                score_threshold=0.5,
            )

            papers: List[RelevantPaper] = []

            # ✅ Correct iteration
            for point in results.points:
                try:
                    payload = point.payload or {}

                    paper = RelevantPaper(
                        title=payload.get("title", "Unknown"),
                        summary=payload.get("summary", ""),
                        link=payload.get("link", ""),
                        relevance_score=point.score,
                    )
                    papers.append(paper)

                except Exception as e:
                    logger.warning(f"Error processing search result: {e}")
                    continue

            logger.info(f"Found {len(papers)} relevant papers")
            return papers

        except Exception as e:
            logger.error(f"Error in search_papers: {e}")
            return []

    def _create_search_query(self, input_data: StructuredFeasibilityInput) -> str:
        """Create a search query from project details."""
        parts = []

        if input_data.product_domain:
            parts.append(f"Domain: {input_data.product_domain}")

        if input_data.application_area:
            parts.append(f"Application: {input_data.application_area}")

        if input_data.summary:
            parts.append(f"Summary: {input_data.summary[:200]}")

        if input_data.key_challenges:
            parts.append(f"Challenges: {', '.join(input_data.key_challenges[:3])}")

        if input_data.key_opportunities:
            parts.append(f"Opportunities: {', '.join(input_data.key_opportunities[:3])}")

        query = " ".join(parts)

        if not query.strip():
            query = f"{input_data.product_domain} {input_data.application_area} feasibility implementation"

        return query

    def search_by_text(
        self,
        text: str,
        top_k: int = 5,
    ) -> List[RelevantPaper]:
        """Search papers by free text."""
        if self.client is None:
            return []

        try:
            query_embedding = self.embed_text(text)
            if not query_embedding:
                return []

            results = self.client.query_points(
                collection_name=self.collection_name,
                query=query_embedding,
                limit=top_k,
                score_threshold=0.5,
            )

            papers: List[RelevantPaper] = []

            # ✅ Correct iteration
            for point in results.points:
                try:
                    payload = point.payload or {}

                    paper = RelevantPaper(
                        title=payload.get("title", "Unknown"),
                        summary=payload.get("summary", ""),
                        link=payload.get("link", ""),
                        relevance_score=point.score,
                    )
                    papers.append(paper)

                except Exception as e:
                    logger.warning(f"Error processing result: {e}")
                    continue

            return papers

        except Exception as e:
            logger.error(f"Error in search_by_text: {e}")
            return []


# -------------------------------
# Global instance helper
# -------------------------------

_search_service: Optional[SemanticSearchService] = None


def get_search_service() -> SemanticSearchService:
    """Get or create global search service instance."""
    global _search_service
    if _search_service is None:
        _search_service = SemanticSearchService()
    return _search_service
