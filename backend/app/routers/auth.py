from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.services.supabase_client import get_supabase_client, SupabaseError
from app.dependencies import get_current_user
from app.utils.audit_logger import log as audit_log

router = APIRouter()


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login via Supabase Auth.
    Retourne un JWT Supabase + les infos utilisateur + son rôle.
    """
    try:
        supabase = get_supabase_client()
        session = supabase.sign_in(
            email=form_data.username,
            password=form_data.password,
        )
    except SupabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Récupérer le profil (rôle)
        # Récupérer le profil (rôle)
    try:
        profile = supabase.get_profile(session["user"]["id"])
        print(f"DEBUG profile: {profile}", flush=True)   # ← AJOUTER
    except SupabaseError as e:
        print(f"DEBUG SupabaseError: {e}", flush=True)   # ← AJOUTER
        profile = None

    user = {
        "id": session["user"]["id"],
        "email": session["user"]["email"],
        "role": (profile or {}).get("role", "admin"),
    }

    audit_log(user["email"], "auth.login", f"user_id={user['id']}")

    return {
        "token": session["access_token"],
        "refresh_token": session["refresh_token"],
        "expires_at": session.get("expires_at"),
        "user": user,
    }


@router.post("/logout")
async def logout(user=Depends(get_current_user)):
    """Déconnexion (invalide le token côté client)."""
    audit_log(user.get("email", "system"), "auth.logout", "")
    return {"message": "ok"}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    """Retourne l'utilisateur courant."""
    return {"user": user}