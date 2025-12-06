from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.chat import ChatSession, ChatMessage, SenderType
from app.schemas.chat import ChatRequest, ChatResponse, ChatSessionOut, ChatMessageOut
from app.security import deps
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.future import select
from app.services.chat_service import handle_chat
from sqlalchemy import delete
from typing import List
from fastapi import BackgroundTasks
import logging
logger = logging.getLogger()


router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)


@router.post("/send-message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    logger.info("Called function-")
    return await handle_chat(request, db, None, background_tasks)


@router.get("/sessions", response_model=List[ChatSessionOut])
async def get_chat_sessions(
    db: AsyncSession = Depends(get_db),
    user_id: int = Query(default=1, description="User ID for fetching sessions")
):
    """Retrieve all chat sessions for a user (defaults to user_id=1 for unauthenticated)."""
    try:
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.user_id == user_id)
            .order_by(ChatSession.created_at.desc())
        )
        sessions = result.scalars().all()
        logger.info(f"Fetched {len(sessions)} sessions for user_id={user_id}")
        return sessions
    except Exception as e:
        logger.error(f"Error fetching sessions: {e}")
        return []


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageOut])
async def get_session_messages(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all messages for a specific chat session."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()
    return messages