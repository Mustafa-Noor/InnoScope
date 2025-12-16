from qdrant_client import QdrantClient

qdrant_client = QdrantClient(
    url="https://306b40eb-c48e-4984-9ef0-38f123414040.europe-west3-0.gcp.cloud.qdrant.io:6333", 
    api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.kHg0fw3Pl7HGRUoN5q8YHaQlsOsCQaaR4sUuYp1U73w",
)

print(qdrant_client.get_collections())