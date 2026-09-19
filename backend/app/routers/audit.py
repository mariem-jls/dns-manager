from fastapi import APIRouter, HTTPException, Query
from app.services.supabase_client import get_supabase_client, SupabaseError
from app.dependencies import get_current_user
from fastapi import Depends

router = APIRouter()


@router.get('/logs')
async def list_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    actor: str | None = None,
    action: str | None = None,
    search: str | None = None,
    user=Depends(get_current_user),
):
    """Liste les logs d'audit depuis Supabase."""
    try:
        supabase = get_supabase_client()
        
        # Construire la requête
        query = supabase.client.table("audit_logs").select("*", count="exact")
        
        # Filtres
        if actor:
            query = query.eq("actor", actor)
        if action:
            query = query.eq("action", action)
        if search:
            query = query.ilike("details", f"%{search}%")
        
        # Tri par date décroissante
        query = query.order("created_at", desc=True)
        
        # Pagination
        query = query.range(skip, skip + limit - 1)
        
        response = query.execute()
        
        items = response.data or []
        total = response.count or len(items)
        
        # Normaliser le format pour le frontend
        formatted_items = []
        for log in items:
            formatted_items.append({
                "id": log.get("id"),
                "timestamp": log.get("created_at"),
                "actor": log.get("actor"),
                "action": log.get("action"),
                "details": log.get("details"),
                "level": "INFO",  
            })
        
        return {
            "items": formatted_items,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": skip + limit < total,
        }
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=f"Supabase error: {str(e)}")