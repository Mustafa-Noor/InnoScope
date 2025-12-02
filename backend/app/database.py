from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from config import settings
import logging

logger = logging.getLogger(__name__)

# Read DB URL from settings; provide a safe local default for development when not set
DATABASE_URL = settings.Database_URL or ""

# Choose connect args based on DB backend. Some drivers (e.g. asyncpg for Postgres)
# may require SSL; sqlite does not accept the same connect_args.
if DATABASE_URL.startswith("sqlite"):
    engine = create_async_engine(DATABASE_URL, echo=True)
else:
    # For Postgres / other drivers, keep ssl True as the original code did
    engine = create_async_engine(DATABASE_URL, connect_args={"ssl": True}, echo=True)

AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
    