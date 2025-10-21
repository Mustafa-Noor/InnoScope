from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str  # plain password (to be hashed)

class UserOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

class UserLogin(BaseModel):
    email: EmailStr
    password: str 