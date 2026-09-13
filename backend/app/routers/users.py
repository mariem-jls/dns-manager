from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.utils.audit_logger import log as audit_log

router = APIRouter()

@router.get('/')
async def list_users(user=Depends(get_current_user)):
    return [{"id":1, "email":"admin@dynamix.com", "role":"admin"}]

@router.post('/invite')
async def invite(payload: dict, user=Depends(get_current_user)):
    email = payload.get('email')
    role = payload.get('role','viewer')
    # In real implementation: create user in Supabase and send invite
    audit_log(user.get('email', 'system'), 'users.invite', f"email={email} role={role}")
    return {"ok": True, "email": email, "role": role}
