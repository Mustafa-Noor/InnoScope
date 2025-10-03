import os
from dotenv import load_dotenv

load_dotenv()  # Load .env variables

class Settings:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

settings = Settings()