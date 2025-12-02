from datetime import datetime, timedelta
from jose import JWTError, jwt
from config import settings
from schemas.token import TokenData
from fastapi import HTTPException


SECRET_KEY = settings.Secret_Key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str):
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

def verify_token(token: str, credentials_exception):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
        return token_data
    except JWTError:
        raise credentials_exception


def create_reset_token(email: str):
    expire = datetime.utcnow() + timedelta(minutes=15)
    payload = {"sub": email, "purpose": "reset_password", "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_reset_token(token: str):
    try:
        payload = decode_token(token)
        if payload.get("purpose") != "reset_password":
            raise ValueError("Invalid token purpose")
        return payload
    except (JWTError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))

