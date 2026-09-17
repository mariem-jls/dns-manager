from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional

from app.schemas.zone import ZoneCreate, ZoneRead, ZoneUpdate
from app.services.bind_manager import BindManager, BindManagerError
from app.services.supabase_client import get_supabase_client, SupabaseError
from app.dependencies import get_current_user
from app.utils.audit_logger import log as audit_log

router = APIRouter()
manager = BindManager()


@router.get("/")
async def list_zones(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    user=Depends(get_current_user),
):
    """Liste les zones BIND + enrichit avec les métadonnées Supabase."""
    try:
        zones = manager.list_zones()
        
        try:
            supabase = get_supabase_client()
            metas = {z["name"]: z for z in supabase.list_zones()}
            for z in zones:
                meta = metas.get(z.name)
                if meta:
                    z.description = meta.get("description")
        except SupabaseError as e:
            print(f"WARNING: Supabase error: {e}")
        
        if search:
            search_lower = search.lower()
            zones = [z for z in zones if search_lower in z.name.lower()]
        
        total = len(zones)
        items = zones[skip:skip + limit]
        
        return {
            "items": items,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": skip + limit < total,
        }
    except BindManagerError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/", response_model=ZoneRead, status_code=status.HTTP_201_CREATED)
async def create_zone(payload: ZoneCreate, user=Depends(get_current_user)):
    print(f"DEBUG user: {user}", flush=True)   # ← AJOUTER
    try:
        z = manager.create_zone(
            name=payload.name,
            ztype=payload.type,
            description=payload.description,
        )

        try:
            supabase = get_supabase_client()
            supabase.create_zone(
                name=z.name,
                ztype=z.type,
                description=payload.description,
                created_by=user.get("email"),
            )
            supabase.log_action(
                actor=user.get("email", "system"),
                action="zones.create",
                details=f"name={z.name} type={z.type}",
            )
        except SupabaseError as e:
            print(f"WARNING: Supabase sync failed: {e}")

        audit_log(
            user.get("email", "system"),
            "zones.create",
            f"name={z.name} type={z.type}",
        )
        return z
    except BindManagerError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@router.get("/{zone_name}", response_model=ZoneRead)
async def get_zone(zone_name: str, user=Depends(get_current_user)):
    try:
        z = manager.get_zone(zone_name)
        if not z:
            raise HTTPException(status_code=404, detail="Zone not found")

        try:
            supabase = get_supabase_client()
            meta = supabase.get_zone(z.name)
            if meta:
                z.description = meta.get("description")
        except SupabaseError as e:
            print(f"WARNING: Supabase error: {e}")

        return z
    except BindManagerError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{zone_name}", response_model=ZoneRead)
async def update_zone(
    zone_name: str,
    payload: ZoneUpdate,
    user=Depends(get_current_user),
):
    try:
        z = manager.update_zone(zone_name, description=payload.description)
        if not z:
            raise HTTPException(status_code=404, detail="Zone not found")

        try:
            supabase = get_supabase_client()
            supabase.update_zone(z.name, description=payload.description)
            supabase.log_action(
                actor=user.get("email", "system"),
                action="zones.update",
                details=f"name={z.name}",
            )
        except SupabaseError as e:
            print(f"WARNING: Supabase sync failed: {e}")

        return z
    except BindManagerError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{zone_name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_zone(zone_name: str, user=Depends(get_current_user)):
    try:
        removed = manager.delete_zone(zone_name)
        if not removed:
            raise HTTPException(status_code=404, detail="Zone not found")

        try:
            supabase = get_supabase_client()
            supabase.delete_zone(zone_name)
            supabase.log_action(
                actor=user.get("email", "system"),
                action="zones.delete",
                details=f"name={zone_name}",
            )
        except SupabaseError as e:
            print(f"WARNING: Supabase sync failed: {e}")

        audit_log(
            user.get("email", "system"),
            "zones.delete",
            f"name={zone_name}",
        )
    except BindManagerError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{zone_name}/validate")
async def validate_zone(zone_name: str, user=Depends(get_current_user)):
    try:
        ok, out = manager.validate_zone(zone_name)
        return {"ok": ok, "output": out}
    except BindManagerError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reload")
async def reload_bind(user=Depends(get_current_user)):
    try:
        out = manager.reload()
        audit_log(user.get("email", "system"), "zones.reload", "rndc reload")
        return {"ok": True, "result": out}
    except BindManagerError as e:
        raise HTTPException(status_code=500, detail=str(e))