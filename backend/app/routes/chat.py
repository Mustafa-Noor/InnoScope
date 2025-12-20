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
    logger.info(f"Chat message from user_id={request.user_id}")
    return await handle_chat(request, db, None, background_tasks)


@router.get("/sessions", response_model=List[ChatSessionOut])
async def get_chat_sessions(
    user_id: str = Query(..., description="User ID (required)"),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve all chat sessions for a user."""
    try:
        # Validate user_id format
        if not user_id or not user_id.strip():
            raise HTTPException(status_code=400, detail="user_id is in invalid format")
        
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.user_id == user_id)
            .order_by(ChatSession.created_at.desc())
        )
        sessions = result.scalars().all()
        logger.info(f"Fetched {len(sessions)} sessions for user_id={user_id}")
        return sessions
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching sessions: {e}")
        return []


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageOut])
async def get_session_messages(
    session_id: int,
    user_id: str = Query(..., description="User ID (required)"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all messages for a specific chat session."""
    try:
        # Validate user_id format
        if not user_id or not user_id.strip():
            raise HTTPException(status_code=400, detail="user_id is in invalid format")
        
        # Verify session belongs to user
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get messages
        result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
        )
        messages = result.scalars().all()
        return messages
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching messages: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")