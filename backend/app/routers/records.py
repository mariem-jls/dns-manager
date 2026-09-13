from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.utils.audit_logger import log as audit_log

router = APIRouter()

@router.get("/{zone_name}/records")
async def list_records(zone_name: str, user=Depends(get_current_user)):
    # placeholder: read zone file and parse records
    return {"zone": zone_name, "records": []}

@router.post("/{zone_name}/records")
async def add_record(zone_name: str, payload: dict, user=Depends(get_current_user)):
    # placeholder: append to zone file and reload
    audit_log(user.get('email', 'system'), 'records.add', f"zone={zone_name} payload={payload}")
    return {"ok": True}
