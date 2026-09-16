from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.services.supabase_client import get_supabase_client, SupabaseError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Vérifie le JWT Supabase et retourne l'utilisateur + son rôle.
    Lève 401 si le token est invalide.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        supabase = get_supabase_client()
        user_info = supabase.get_user_from_token(token)
    except SupabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Auth error: {e}",
        )

    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Récupérer le rôle
    role = "viewer"
    try:
        profile = supabase.get_profile(user_info["id"])
        if profile:
            role = profile.get("role", "viewer")
    except SupabaseError:
        pass

    return {
        "id": user_info["id"],
        "email": user_info["email"],
        "role": role,
    }


def require_role(*allowed_roles: str):
    """
    Dépendance pour restreindre l'accès à certains rôles.
    Usage: user=Depends(require_role("admin", "operator"))
    """
    def role_checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(allowed_roles)}",
            )
        return user
    return role_checker