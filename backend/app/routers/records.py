from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.record import RecordCreate, RecordRead
from app.services.bind_manager import BindManager, BindManagerError
from app.services.supabase_client import get_supabase_client, SupabaseError
from app.dependencies import get_current_user
from app.utils.audit_logger import log as audit_log

router = APIRouter()
manager = BindManager()


@router.get("/{zone_name}/records", response_model=list[RecordRead])
async def list_records(zone_name: str, user=Depends(get_current_user)):
    """Liste les enregistrements d'une zone."""
    try:
        records = manager.list_records(zone_name)

        # Enrichir avec les métadonnées Supabase (created_by, created_at)
        try:
            supabase = get_supabase_client()
            metas = {
                f"{r['name']}|{r['type']}|{r['value']}": r
                for r in supabase.list_records(zone_name)
            }
            for rec in records:
                key = f"{rec['name']}|{rec['type']}|{rec['value']}"
                meta = metas.get(key)
                if meta:
                    rec["created_by"] = meta.get("created_by")
                    rec["created_at"] = meta.get("created_at")
        except SupabaseError as e:
            print(f"WARNING: Supabase error: {e}")

        return records
    except BindManagerError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/{zone_name}/records",
    response_model=RecordRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_record(
    zone_name: str,
    payload: RecordCreate,
    user=Depends(get_current_user),
):
    """Ajoute un enregistrement (BIND + Supabase)."""
    try:
        # 1. Ajouter dans BIND
        record = manager.add_record(
            zone_name=zone_name,
            name=payload.name,
            rtype=payload.type,
            value=payload.value,
            ttl=payload.ttl,
            priority=payload.priority,
        )

        # 2. Stocker les métadonnées dans Supabase
        try:
            supabase = get_supabase_client()
            supabase.create_record(
                zone_name=zone_name,
                name=payload.name,
                rtype=payload.type,
                value=payload.value,
                ttl=payload.ttl,
                priority=payload.priority,
                created_by=user.get("email"),
            )
        except SupabaseError as e:
            print(f"WARNING: Supabase sync failed: {e}")

        audit_log(
            user.get("email", "system"),
            "records.add",
            f"zone={zone_name} name={payload.name} type={payload.type}",
        )
        return record
    except BindManagerError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{zone_name}/records/{record_id}")
async def delete_record(
    zone_name: str,
    record_id: str,
    user=Depends(get_current_user),
):
    """Supprime un enregistrement (BIND + Supabase)."""
    try:
        # 1. Récupérer les infos du record avant suppression
        records = manager.list_records(zone_name)
        target = next((r for r in records if r["id"] == record_id), None)

        # 2. Supprimer dans BIND
        removed = manager.delete_record(zone_name, record_id)
        if not removed:
            raise HTTPException(status_code=404, detail="Record not found")

        # 3. Supprimer les métadonnées dans Supabase
        if target:
            try:
                supabase = get_supabase_client()
                supabase.delete_record(
                    zone_name=zone_name,
                    name=target["name"],
                    rtype=target["type"],
                    value=target["value"],
                )
            except SupabaseError as e:
                print(f"WARNING: Supabase sync failed: {e}")

        audit_log(
            user.get("email", "system"),
            "records.delete",
            f"zone={zone_name} record={record_id}",
        )
        return {"ok": True}
    except BindManagerError as e:
        raise HTTPException(status_code=400, detail=str(e))