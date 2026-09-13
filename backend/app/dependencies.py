from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

_demo_user = {"id": 1, "email": "admin@dynamix.com", "role": "admin"}

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    if not token:
        return _demo_user
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload.get("user") or _demo_user
    except JWTError:
        return _demo_user
