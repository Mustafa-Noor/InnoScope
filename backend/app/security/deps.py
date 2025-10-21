from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.security import jwt_token
from app.database import get_db
from sqlalchemy.orm import Session
from app.models.user import User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token_data: TokenData = jwt_token.verify_token(token, credentials_exception)

    result = await db.execute(select(User).where(User.id == int(token_data.user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user

