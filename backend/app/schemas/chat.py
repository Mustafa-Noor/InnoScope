from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class SenderType(str, Enum):
    user = "user"
    assistant = "assistant"


class ChatSessionCreate(BaseModel):
    user_id: str
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
    user_id: Optional[str] = None  # MCP provides as string

    @field_validator('user_id', mode='before')
    @classmethod
    def validate_user_id(cls, v):
        if v is None:
            return None
        if not isinstance(v, str):
            raise ValueError("user_id must be a string")
        if not v.strip():
            raise ValueError("user_id cannot be empty")
        return v

class ChatResponse(BaseModel):
    session_id: int
    reply: str
    is_complete: bool = False  # True when 2 user messages reached
    problem_statement: Optional[str] = None
    domain: Optional[str] = None
    goals: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None
    key_topics: Optional[List[str]] = None
    summary: Optional[str] = None