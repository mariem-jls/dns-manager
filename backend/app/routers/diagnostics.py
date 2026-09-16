import ipaddress
import re
import subprocess

from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.dependencies import get_current_user
from app.utils.audit_logger import log as audit_log

router = APIRouter()

# ============================================
# CONSTANTES DE VALIDATION
# ============================================

# Regex stricte pour les noms de domaine
DOMAIN_REGEX = re.compile(
    r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$"
)

# Types d'enregistrement autorisés
ALLOWED_QTYPES = {
    "A", "AAAA", "CNAME", "MX", "NS", "SOA", "TXT", "PTR", "SRV", "CAA",
}

# Regex pour un serveur DNS (IP ou hostname)
HOSTNAME_REGEX = re.compile(
    r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$"
)

# Timeout pour les commandes subprocess
DIG_TIMEOUT = 5
CHECKZONE_TIMEOUT = 10


def validate_domain(domain: str) -> str:
    """Valide un nom de domaine."""
    if not domain or not isinstance(domain, str):
        raise HTTPException(status_code=400, detail="domain is required")

    normalized = domain.strip().lower().rstrip(".")

    if not DOMAIN_REGEX.match(normalized):
        raise HTTPException(
            status_code=400,
            detail="Invalid domain name format",
        )

    if ".." in normalized or "/" in normalized or "\\" in normalized:
        raise HTTPException(status_code=400, detail="Invalid characters in domain")

    return normalized


def validate_qtype(qtype: str) -> str:
    """Valide le type d'enregistrement DNS."""
    if not qtype:
        return "A"

    normalized = qtype.strip().upper()

    if normalized not in ALLOWED_QTYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid qtype. Allowed: {', '.join(sorted(ALLOWED_QTYPES))}",
        )

    return normalized


def validate_server(server: str | None) -> str | None:
    """
    Valide un serveur DNS (IP ou hostname).
    Bloque les IPs metadata cloud.
    """
    if not server:
        return None

    normalized = server.strip().lower()

    # Bloquer les IPs metadata cloud (SSRF)
    blocked_networks = [
        ipaddress.ip_network("169.254.0.0/16"),   # Link-local / AWS metadata
        ipaddress.ip_network("100.100.100.200/32"),  # Alibaba metadata
    ]

    try:
        ip = ipaddress.ip_address(normalized)
        for net in blocked_networks:
            if ip in net:
                raise HTTPException(
                    status_code=400,
                    detail="Server IP is not allowed",
                )
        return normalized
    except ValueError:
        # Pas une IP, c'est peut-être un hostname
        pass

    if not HOSTNAME_REGEX.match(normalized):
        raise HTTPException(status_code=400, detail="Invalid server format")

    return normalized


def validate_zone_name(zone: str) -> str:
    """Valide un nom de zone (comme un domaine)."""
    return validate_domain(zone)


def validate_zone_path(path: str | None, zone: str) -> str:
    """
    Valide un chemin de fichier de zone.
    Bloque les chemins hors de BIND_ZONES_PATH.
    """
    base = settings.bind_zones_path.rstrip("/")

    if not path:
        return f"{base}/{zone}.db"

    normalized = path.strip()

    # Bloquer les chemins qui ne commencent pas par le dossier autorisé
    if not normalized.startswith(base):
        raise HTTPException(
            status_code=400,
            detail=f"Path must be under {base}",
        )

    # Bloquer les .. et caractères dangereux
    if ".." in normalized or "\x00" in normalized:
        raise HTTPException(status_code=400, detail="Invalid path")

    return normalized


# ============================================
# ENDPOINTS
# ============================================


@router.post("/dig")
async def dig(payload: dict, user=Depends(get_current_user)):
    """
    Exécute une requête dig.
    Valide strictement domain, qtype et server.
    """
    domain = validate_domain(payload.get("domain", ""))
    qtype = validate_qtype(payload.get("type", "A"))
    server = validate_server(payload.get("server"))

    cmd = ["dig", "+short", "+time=3", "+tries=1", domain, qtype]
    if server:
        cmd.append(f"@{server}")

    try:
        out = subprocess.check_output(
            cmd,
            stderr=subprocess.STDOUT,
            text=True,
            timeout=DIG_TIMEOUT,
        )
        audit_log(
            user.get("email", "system"),
            "diagnostics.dig",
            f"domain={domain} type={qtype} server={server or 'default'}",
        )
        return {"ok": True, "output": out}
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="dig command timed out")
    except subprocess.CalledProcessError as e:
        return {"ok": False, "output": e.output}
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="dig not installed")


@router.post("/zone-check")
async def zone_check(payload: dict, user=Depends(get_current_user)):
    """
    Valide un fichier de zone avec named-checkzone.
    Valide strictement zone et path.
    """
    zone = validate_zone_name(payload.get("zone", ""))
    path = validate_zone_path(payload.get("path"), zone)

    try:
        out = subprocess.check_output(
            ["named-checkzone", zone, path],
            stderr=subprocess.STDOUT,
            text=True,
            timeout=CHECKZONE_TIMEOUT,
        )
        audit_log(
            user.get("email", "system"),
            "diagnostics.zone_check",
            f"zone={zone} path={path}",
        )
        return {"ok": True, "output": out}
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="named-checkzone timed out")
    except subprocess.CalledProcessError as e:
        return {"ok": False, "output": e.output}
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="named-checkzone not installed")


@router.post("/propagation")
async def propagation(payload: dict, user=Depends(get_current_user)):
    """
    Compare la propagation DNS entre primaire et secondaire.
    Valide strictement zone, primary et secondary.
    """
    zone = validate_zone_name(payload.get("zone", ""))
    primary = validate_server(payload.get("primary", "bind9")) or "bind9"
    secondary = validate_server(payload.get("secondary", "bind9-secondary")) or "bind9-secondary"

    def dig_soa(server: str) -> str:
        try:
            out = subprocess.check_output(
                ["dig", "+short", "+time=3", "+tries=1", f"@{server}", zone, "SOA"],
                stderr=subprocess.STDOUT,
                text=True,
                timeout=DIG_TIMEOUT,
            )
            return out.strip()
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
            return ""

    primary_answer = dig_soa(primary)
    secondary_answer = dig_soa(secondary)

    audit_log(
        user.get("email", "system"),
        "diagnostics.propagation",
        f"zone={zone} primary={primary} secondary={secondary}",
    )

    return {
        "zone": zone,
        "primary": primary,
        "secondary": secondary,
        "in_sync": bool(primary_answer) and primary_answer == secondary_answer,
        "primary_answer": primary_answer,
        "secondary_answer": secondary_answer,
    }