from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey, Enum as PgEnum, func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class SenderType(str, enum.Enum):
    user = "user"
    assistant = "assistant"


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    topic = Column(String(100))
    title = Column(String(255))
    memory = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"))
    sender = Column(PgEnum(SenderType), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())