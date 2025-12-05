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