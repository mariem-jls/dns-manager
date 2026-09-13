from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.schemas.zone import ZoneCreate, ZoneRead
from app.services.bind_manager import BindManager
from app.dependencies import get_current_user
from app.utils.audit_logger import log as audit_log

router = APIRouter()
manager = BindManager()

@router.get("/", response_model=List[ZoneRead])
async def list_zones(user=Depends(get_current_user)):
    zones = manager.list_zones()
    return zones

@router.post("/", response_model=ZoneRead)
async def create_zone(payload: ZoneCreate, user=Depends(get_current_user)):
    try:
        z = manager.create_zone(payload.name, payload.type, payload.description)
        audit_log(user.get('email', 'system'), 'zones.create', f"name={payload.name} type={payload.type}")
        return z
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{zone_name}/validate")
async def validate_zone(zone_name: str, user=Depends(get_current_user)):
    ok, out = manager.validate_zone(zone_name)
    return {"ok": ok, "output": out}

@router.post("/reload")
async def reload_bind(user=Depends(get_current_user)):
    out = manager.reload()
    audit_log(user.get('email', 'system'), 'zones.reload', 'rndc reload')
    return {"result": out}
