import os
from dotenv import load_dotenv

load_dotenv()  # Load .env variables

class Settings:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
    Database_URL: str = os.getenv("DATABASE_URL")
    Secret_Key: str = os.getenv("SECRET_KEY")
    Hf_Token: str = os.getenv("HF_TOKEN")
    QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY")
    QDRANT_URL: str = os.getenv("QDRANT_URL")

settings = Settings()