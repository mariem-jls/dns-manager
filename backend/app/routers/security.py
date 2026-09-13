from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.dependencies import get_current_user
from app.utils.audit_logger import log as audit_log

router = APIRouter()
RPZ_FILENAME = "rpz-blacklist.txt"


def rpz_file_path() -> Path:
    base_path = Path(settings.bind_zones_path)
    base_path.mkdir(parents=True, exist_ok=True)
    return base_path / RPZ_FILENAME


def read_rpz_entries() -> list[str]:
    file_path = rpz_file_path()
    if not file_path.exists():
        return []
    return [line.strip() for line in file_path.read_text().splitlines() if line.strip()]


def write_rpz_entries(entries: list[str]) -> None:
    file_path = rpz_file_path()
    file_path.write_text("\n".join(entries) + ("\n" if entries else ""))


@router.get("/dnssec")
async def dnssec_status():
    zones_path = Path(settings.bind_zones_path)
    signed_zones = sorted({path.stem for path in zones_path.glob("*.signed")})
    keys = sorted({path.name for path in zones_path.glob("*.key")})
    return {
        "enabled": bool(signed_zones or keys),
        "signed_zones": signed_zones,
        "keys": keys,
    }


@router.post("/dnssec/rotate")
async def rotate_dnssec_keys(payload: dict | None = None, user=Depends(get_current_user)):
    zone_name = (payload or {}).get("zone_name")
    if not zone_name:
        raise HTTPException(status_code=400, detail="zone_name is required")
    audit_log(user.get('email', 'system'), 'security.dnssec.rotate', f"zone={zone_name}")
    return {
        "ok": True,
        "message": f"Rotation demandée pour {zone_name}",
        "zone_name": zone_name,
    }


@router.get("/rpz")
async def list_rpz():
    return {"items": read_rpz_entries()}


@router.post("/rpz")
async def add_rpz_domain(payload: dict, user=Depends(get_current_user)):
    domain = (payload or {}).get("domain", "").strip().lower()
    if not domain:
        raise HTTPException(status_code=400, detail="domain is required")

    entries = read_rpz_entries()
    if domain not in entries:
        entries.append(domain)
        entries.sort()
        write_rpz_entries(entries)
        audit_log(user.get('email', 'system'), 'security.rpz.add', f"domain={domain}")

    return {"ok": True, "items": entries}


@router.delete("/rpz/{domain}")
async def delete_rpz_domain(domain: str, user=Depends(get_current_user)):
    normalized = domain.strip().lower()
    entries = [entry for entry in read_rpz_entries() if entry != normalized]
    write_rpz_entries(entries)
    audit_log(user.get('email', 'system'), 'security.rpz.delete', f"domain={normalized}")
    return {"ok": True, "items": entries}


@router.get("/dot-doh")
async def dot_doh_status():
    return {
        "dot": {"enabled": True, "port": 853, "certificate": "configured"},
        "doh": {"enabled": True, "port": 443, "certificate": "configured"},
    }