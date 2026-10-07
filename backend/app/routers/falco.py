from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.services.supabase_client import get_supabase_client, SupabaseError
from app.utils.audit_logger import log as audit_log

router = APIRouter()


class FalcoEvent(BaseModel):
    """Payload envoyé par Falcosidekick."""
    priority: str | None = None
    rule: str | None = None
    output: str | None = None
    output_fields: dict | None = None
    time: str | None = None
    source: str | None = None
    tags: list[str] | None = None
    hostname: str | None = None


@router.post("/events")
async def receive_falco_event(event: FalcoEvent):
    """
    Reçoit un événement Falco de Falcosidekick.
    Stocke dans Supabase + audit log.
    """
    try:
        supabase = get_supabase_client()

        # Extraire les champs utiles
        fields = event.output_fields or {}
        container_name = fields.get("container.name", "unknown")
        container_image = fields.get("container.image.repository", "unknown")
        user_name = fields.get("user.name", "unknown")
        proc_cmdline = fields.get("proc.cmdline", "")

        data = {
            "priority": event.priority or "unknown",
            "rule": event.rule or "unknown",
            "output": event.output or "",
            "container_name": container_name,
            "container_image": container_image,
            "user_name": user_name,
            "proc_cmdline": proc_cmdline,
            "source": event.source or "syscall",
            "hostname": event.hostname or "",
            "tags": event.tags or [],
            "raw": event.model_dump(),
        }

        # Insérer dans Supabase
        supabase._rest_post("falco_events", data)

        # Audit log
        audit_log(
            "falco",
            f"falco.{event.priority or 'unknown'}",
            f"rule={event.rule} container={container_name}",
        )

        return {"ok": True}
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"WARNING: Failed to store Falco event: {e}", flush=True)
        return {"ok": False, "error": str(e)}


@router.get("/events")
async def list_falco_events(
    limit: int = 50,
    priority: str | None = None,
    container: str | None = None,
    user=Depends(get_current_user),
):
    """Liste les événements Falco récents."""
    try:
        supabase = get_supabase_client()
        params = {
            "order": "created_at.desc",
            "limit": limit,
        }
        if priority:
            params["priority"] = f"eq.{priority}"
        if container:
            params["container_name"] = f"eq.{container}"

        events = supabase._rest_get("falco_events", params)
        return {"items": events, "total": len(events)}
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def falco_stats(user=Depends(get_current_user)):
    """Statistiques Falco (compteurs par priorité)."""
    try:
        supabase = get_supabase_client()
        events = supabase._rest_get("falco_events", {"limit": 1000})

        stats = {
            "total": len(events),
            "by_priority": {},
            "by_container": {},
            "by_rule": {},
        }
        for e in events:
            p = e.get("priority", "unknown")
            c = e.get("container_name", "unknown")
            r = e.get("rule", "unknown")
            stats["by_priority"][p] = stats["by_priority"].get(p, 0) + 1
            stats["by_container"][c] = stats["by_container"].get(c, 0) + 1
            stats["by_rule"][r] = stats["by_rule"].get(r, 0) + 1

        return stats
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))