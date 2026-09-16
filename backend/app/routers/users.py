from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_current_user, require_role
from app.services.supabase_client import get_supabase_client, SupabaseError
from app.utils.audit_logger import log as audit_log

router = APIRouter()


@router.get("/")
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = Query(None),
    user=Depends(get_current_user),
):
    try:
        supabase = get_supabase_client()
        profiles = supabase.list_users()

        if search:
            search_lower = search.lower()
            profiles = [
                p for p in profiles
                if search_lower in (p.get("email") or "").lower()
            ]

        total = len(profiles)
        profiles = profiles[skip : skip + limit]

        return {
            "items": profiles,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": skip + limit < total,
        }
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