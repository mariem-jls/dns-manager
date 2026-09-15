from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from app.config import settings
from datetime import datetime, timedelta

router = APIRouter()

# minimal in-memory user for demo
_demo_user = {"id":1, "email":"admin@dynamix.com", "role":"admin"}

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # WARNING: replace with Supabase auth in production
    if form_data.username == "admin@dynamix.com" and form_data.password == "password":
        payload = {"user": _demo_user, "exp": datetime.utcnow() + timedelta(hours=8)}
        token = jwt.encode(payload, settings.secret_key, algorithm="HS256")
        return {"token": token, "user": _demo_user}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/logout")
async def logout():
    return {"message":"ok"}

@router.get("/me")
async def me():
    return {"user": _demo_user}
