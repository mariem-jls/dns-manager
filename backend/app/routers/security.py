import re
import subprocess
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.dependencies import get_current_user, require_role
from app.services.bind_manager import BindManager, BindManagerError
from app.utils.audit_logger import log as audit_log

router = APIRouter()
manager = BindManager()

# Regex domaine
DOMAIN_REGEX = re.compile(
    r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$"
)


# ============================================
# HELPERS DNSSEC
# ============================================

def _list_dnssec_zones() -> list[str]:
    """Liste les zones signées (fichiers .signed)."""
    zones = []
    for zone in manager.list_zones():
        if zone.type != "master":
            continue
        zone_file = manager._get_zone_file(zone.name)
        if zone_file and zone_file.exists():
            signed_file = zone_file.with_suffix(zone_file.suffix + ".signed")
            if signed_file.exists():
                zones.append(zone.name)
    return zones


def _dnssec_key_info(zone: str) -> dict:
    """Récupère les infos sur les clés DNSSEC d'une zone."""
    result = {
        "zone": zone,
        "has_ksk": False,
        "has_zsk": False,
        "algorithm": None,
        "expires_at": None,
    }
    try:
        zone_file = manager._get_zone_file(zone)
        if not zone_file:
            return result

        keys_dir = zone_file.parent
        for key_file in keys_dir.glob(f"K{zone}.*.key"):
            if "+007+" in key_file.name:  # KSK
                result["has_ksk"] = True
            elif "+008+" in key_file.name:  # ZSK
                result["has_zsk"] = True

            try:
                content = key_file.read_text()
                m = re.search(r"Activate:\s*(\d+)", content)
                if m:
                    result["expires_at"] = datetime.fromtimestamp(int(m.group(1)))
            except Exception:
                pass
    except Exception:
        pass
    return result


# ============================================
# DNSSEC
# ============================================

@router.get("/dnssec")
async def dnssec_status(user=Depends(get_current_user)):
    """Retourne le statut DNSSEC global."""
    signed_zones = _list_dnssec_zones()
    zones_info = [_dnssec_key_info(z) for z in signed_zones]
    return {
        "enabled": len(signed_zones) > 0,
        "signed_zones": signed_zones,
        "zones_info": zones_info,
    }


@router.post("/dnssec/sign")
async def dnssec_sign(payload: dict, user=Depends(require_role("admin"))):
    """Signe une zone avec DNSSEC."""
    zone = payload.get("zone_name", "").strip().lower()
    if not zone or not DOMAIN_REGEX.match(zone):
        raise HTTPException(status_code=400, detail="Invalid zone name")

    try:
        zone_file = manager._get_zone_file(zone)
        if not zone_file:
            raise HTTPException(status_code=404, detail=f"Zone file not found for '{zone}'")

        # Générer KSK et ZSK
        subprocess.check_output(
            ["dnssec-keygen", "-a", "RSASHA256", "-b", "2048", "-n", "ZONE", "-f", "KSK", zone],
            stderr=subprocess.STDOUT, text=True, timeout=30, cwd=str(zone_file.parent),
        )
        subprocess.check_output(
            ["dnssec-keygen", "-a", "RSASHA256", "-b", "1024", "-n", "ZONE", "-f", "ZSK", zone],
            stderr=subprocess.STDOUT, text=True, timeout=30, cwd=str(zone_file.parent),
        )

        # Signer
        subprocess.check_output(
            ["dnssec-signzone", "-o", zone, str(zone_file), "-S", "-K", str(zone_file.parent)],
            stderr=subprocess.STDOUT, text=True, timeout=60, cwd=str(zone_file.parent),
        )

        manager.reload()
        audit_log(user.get("email", "system"), "security.dnssec.sign", f"zone={zone}")

        return {"ok": True, "zone": zone, "message": "Zone signée avec succès"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"DNSSEC signing failed: {e.output}")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="DNSSEC signing timed out")


@router.post("/dnssec/rotate")
async def dnssec_rotate(payload: dict, user=Depends(require_role("admin"))):
    """Renouvelle les clés DNSSEC d'une zone."""
    zone = payload.get("zone_name", "").strip().lower()
    if not zone or not DOMAIN_REGEX.match(zone):
        raise HTTPException(status_code=400, detail="Invalid zone name")

    try:
        zone_file = manager._get_zone_file(zone)
        if not zone_file:
            raise HTTPException(status_code=404, detail=f"Zone file not found for '{zone}'")

        # Supprimer anciennes clés
        for old_key in zone_file.parent.glob(f"K{zone}.*"):
            old_key.unlink()

        # Nouvelles clés
        subprocess.check_output(
            ["dnssec-keygen", "-a", "RSASHA256", "-b", "2048", "-n", "ZONE", "-f", "KSK", zone],
            stderr=subprocess.STDOUT, text=True, timeout=30, cwd=str(zone_file.parent),
        )
        subprocess.check_output(
            ["dnssec-keygen", "-a", "RSASHA256", "-b", "1024", "-n", "ZONE", "-f", "ZSK", zone],
            stderr=subprocess.STDOUT, text=True, timeout=30, cwd=str(zone_file.parent),
        )

        # Re-signer
        subprocess.check_output(
            ["dnssec-signzone", "-o", zone, str(zone_file), "-S", "-K", str(zone_file.parent)],
            stderr=subprocess.STDOUT, text=True, timeout=60, cwd=str(zone_file.parent),
        )

        manager.reload()
        audit_log(user.get("email", "system"), "security.dnssec.rotate", f"zone={zone}")

        return {"ok": True, "zone": zone, "message": "Clés renouvelées"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"DNSSEC rotation failed: {e.output}")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="DNSSEC rotation timed out")


# ============================================
# RPZ (utilise maintenant le BindManager)
# ============================================

@router.get("/rpz")
async def rpz_list(user=Depends(get_current_user)):
    """Liste les domaines bloqués."""
    try:
        items = manager.list_rpz_entries()
        return {"items": items, "total": len(items)}
    except BindManagerError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rpz")
async def rpz_add(payload: dict, user=Depends(require_role("admin"))):
    """Ajoute un domaine à la liste noire."""
    domain = payload.get("domain", "").strip().lower().rstrip(".")
    if not domain or not DOMAIN_REGEX.match(domain):
        raise HTTPException(status_code=400, detail="Invalid domain")

    try:
        added = manager.add_rpz_entry(domain)
        if not added:
            raise HTTPException(status_code=409, detail="Domain already blocked")

        audit_log(user.get("email", "system"), "security.rpz.add", f"domain={domain}")
        return {"ok": True, "domain": domain}
    except BindManagerError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/rpz/{domain}")
async def rpz_delete(domain: str, user=Depends(require_role("admin"))):
    """Supprime un domaine de la liste noire."""
    domain = domain.strip().lower().rstrip(".")
    try:
        removed = manager.remove_rpz_entry(domain)
        if not removed:
            raise HTTPException(status_code=404, detail="Domain not found")

        audit_log(user.get("email", "system"), "security.rpz.delete", f"domain={domain}")
        return {"ok": True}
    except BindManagerError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================
# DoT / DoH
# ============================================

@router.get("/dot-doh")
async def dot_doh_status(user=Depends(get_current_user)):
    """Retourne le statut DoT/DoH."""
    tls_enabled = False
    tls_port = None
    cert_path = None

    try:
        options_file = manager.config_path.parent / "named.conf.options"
        if options_file.exists():
            content = options_file.read_text()
            if "tls " in content.lower():
                tls_enabled = True
                m = re.search(r"listen-on port (\d+)", content)
                if m:
                    tls_port = int(m.group(1))
                m = re.search(r'cert-file\s+"([^"]+)"', content)
                if m:
                    cert_path = m.group(1)
    except Exception:
        pass

    return {
        "dot": {
            "enabled": tls_enabled,
            "port": tls_port or 853,
            "certificate": cert_path or "—",
        },
        "doh": {
            "enabled": False,
            "port": 443,
            "certificate": "—",
        },
    }


# ============================================
# AUDIT SÉCURITÉ
# ============================================

@router.get("/audit")
async def security_audit(limit: int = 20, user=Depends(get_current_user)):
    """Retourne les dernières actions de sécurité."""
    from app.services.supabase_client import get_supabase_client, SupabaseError

    try:
        supabase = get_supabase_client()

        # Utiliser _rest_get (httpx)
        events = supabase._rest_get(
            "audit_logs",
            {
                "or": "(action.like.security.%,action.like.zones.%,action.like.records.%,action.like.falco.%)",
                "order": "created_at.desc",
                "limit": limit,
            },
        )

        items = []
        for log in events or []:
            items.append({
                "id": log.get("id"),
                "timestamp": log.get("created_at"),
                "actor": log.get("actor"),
                "action": log.get("action"),
                "details": log.get("details"),
            })

        return {"items": items, "total": len(items)}
    except SupabaseError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"DEBUG security_audit error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Audit error: {e}")