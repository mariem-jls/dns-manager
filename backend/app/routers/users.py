from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user, require_role
from app.services.supabase_client import get_supabase_client, SupabaseError
from app.utils.audit_logger import log as audit_log

router = APIRouter()


@router.get("/")
async def list_users(user=Depends(get_current_user)):
    """Liste tous les profils utilisateurs."""
    try:
        supabase = get_supabase_client()
        profiles = supabase.list_users()
        return profiles
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invite")
async def invite(
    payload: dict,
    user=Depends(require_role("admin")),
):
    """Invite un utilisateur (admin seulement)."""
    email = payload.get("email")
    role = payload.get("role", "viewer")

    if not email:
        raise HTTPException(status_code=400, detail="email is required")
    if role not in ("admin", "operator", "viewer"):
        raise HTTPException(status_code=400, detail="Invalid role")

    try:
        supabase = get_supabase_client()
        result = supabase.invite_user(email=email, role=role)
        audit_log(
            user.get("email", "system"),
            "users.invite",
            f"email={email} role={role}",
        )
        return {"ok": True, **result}
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))