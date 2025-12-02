from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class SenderType(str, Enum):
    user = "user"
    assistant = "assistant"


class ChatSessionCreate(BaseModel):
    user_id: int
    topic: Optional[str]
    title: Optional[str]

class ChatSessionOut(ChatSessionCreate):
    id: int
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

class ChatMessageCreate(BaseModel):
    session_id: int
    sender: SenderType
    message: str

class ChatMessageOut(ChatMessageCreate):
    id: int
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class ChatRequest(BaseModel):
    session_id: Optional[int] = None
    message: str
    topic: Optional[str] = None  # Required only on first message

class ChatResponse(BaseModel):
    session_id: int
    reply: str