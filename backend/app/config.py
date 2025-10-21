import os
from dotenv import load_dotenv

load_dotenv()  # Load .env variables

class Settings:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
    Database_URL: str = os.getenv("DATABASE_URL")
    Secret_Key: str = os.getenv("SECRET_KEY")

settings = Settings()