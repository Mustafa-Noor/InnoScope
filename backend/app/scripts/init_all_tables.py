import asyncio
from app.database import engine, Base

# Import all model modules to register tables with Base.metadata
from app.models import user  # noqa: F401
from app.models import chat  # noqa: F401


async def create_all_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


def main():
    asyncio.run(create_all_tables())


if __name__ == "__main__":
    main()
