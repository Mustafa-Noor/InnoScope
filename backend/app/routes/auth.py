from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.schemas.user import UserCreate, UserOut, UserLogin
from app.schemas.token import TokenData
from app.models.user import User
from app.security import hashing, jwt_token, deps
from app.config import settings
import traceback

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register", response_model=UserOut)
async def register_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        # Check if email already exists
        stmt = select(User).where(User.email == user.email)
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")

        # Hash the password before saving
        hashed_password = hashing.hash_password(user.password)

        new_user = User(
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            password=hashed_password
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        return UserOut.model_validate(new_user)

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print("ERROR:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/login")
async def login_user(request: UserLogin, db: AsyncSession = Depends(get_db)):
    try:
        # Find user by email
        stmt = select(User).where(User.email == request.email)
        result = await db.execute(stmt)
        db_user = result.scalar_one_or_none()

        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Verify password
        if not hashing.verify_password(request.password, db_user.password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Create JWT token
        access_token = jwt_token.create_access_token(data={"sub": str(db_user.id)})

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": db_user.id,
            "email": db_user.email,
            "first_name": db_user.first_name,
            "last_name": db_user.last_name
        }

    except HTTPException:
        raise
    except Exception as e:
        print("ERROR:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/token")
async def login_token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    """OAuth2 password flow compatible endpoint for Swagger Authorize dialog.
    Treats `username` as email.
    """
    try:
        stmt = select(User).where(User.email == form_data.username)
        result = await db.execute(stmt)
        db_user = result.scalar_one_or_none()

        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        if not hashing.verify_password(form_data.password, db_user.password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        access_token = jwt_token.create_access_token(data={"sub": str(db_user.id)})
        return {"access_token": access_token, "token_type": "bearer"}

    except HTTPException:
        raise
    except Exception as e:
        print("ERROR:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/me", response_model=TokenData)
async def get_current_user(current_user: TokenData = Depends(deps.get_current_user)):
    try:
        return current_user
    except HTTPException:
        raise
    except Exception as e:
        print("ERROR:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")
