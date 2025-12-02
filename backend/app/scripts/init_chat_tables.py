import asyncio
from app.database import engine, Base
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage  # ensure models are imported and registered


async def create_chat_tables():
    async with engine.begin() as conn:
        # Create only the chat-related tables
        await conn.run_sync(
            Base.metadata.create_all,
            tables=[User.__table__, ChatSession.__table__, ChatMessage.__table__],
        )


def main():
    asyncio.run(create_chat_tables())


if __name__ == "__main__":
    main()
