import ipaddress
import re
import subprocess

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.services.bind_manager import BindManager, BindManagerError
from app.utils.audit_logger import log as audit_log

router = APIRouter()
manager = BindManager()

# ============================================
# CONSTANTES
# ============================================

DOMAIN_REGEX = re.compile(
    r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$"
)

ALLOWED_QTYPES = {
    "A", "AAAA", "CNAME", "MX", "NS", "SOA", "TXT", "PTR", "SRV", "CAA",
}

HOSTNAME_REGEX = re.compile(
    r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$"
)

DIG_TIMEOUT = 5
CHECKZONE_TIMEOUT = 10


# ============================================
# VALIDATION
# ============================================

def validate_domain(domain: str) -> str:
    if not domain or not isinstance(domain, str):
        raise HTTPException(status_code=400, detail="domain is required")
    normalized = domain.strip().lower().rstrip(".")
    if not DOMAIN_REGEX.match(normalized):
        raise HTTPException(status_code=400, detail="Invalid domain name format")
    if ".." in normalized or "/" in normalized or "\\" in normalized:
        raise HTTPException(status_code=400, detail="Invalid characters in domain")
    return normalized


def validate_qtype(qtype: str) -> str:
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
    if not server:
        return None
    normalized = server.strip().lower()
    blocked_networks = [
        ipaddress.ip_network("169.254.0.0/16"),
        ipaddress.ip_network("100.100.100.200/32"),
    ]
    try:
        ip = ipaddress.ip_address(normalized)
        for net in blocked_networks:
            if ip in net:
                raise HTTPException(status_code=400, detail="Server IP is not allowed")
        return normalized
    except ValueError:
        pass
    if not HOSTNAME_REGEX.match(normalized):
        raise HTTPException(status_code=400, detail="Invalid server format")
    return normalized


def validate_zone_name(zone: str) -> str:
    return validate_domain(zone)


# ============================================
# HELPERS
# ============================================

def run_dig_full(domain: str, qtype: str, server: str | None = None) -> dict:
    """Exécute dig avec sortie complète (pas +short)."""
    cmd = ["dig", "+time=3", "+tries=1", domain, qtype]
    if server:
        cmd.append(f"@{server}")
    try:
        out = subprocess.check_output(
            cmd, stderr=subprocess.STDOUT, text=True, timeout=DIG_TIMEOUT
        )
        return {"ok": True, "output": out}
    except subprocess.TimeoutExpired:
        return {"ok": False, "output": "Timeout"}
    except subprocess.CalledProcessError as e:
        return {"ok": False, "output": e.output}
    except FileNotFoundError:
        return {"ok": False, "output": "dig not installed"}


def run_dig_short(domain: str, qtype: str, server: str | None = None) -> str:
    """Exécute dig +short."""
    cmd = ["dig", "+short", "+time=3", "+tries=1", domain, qtype]
    if server:
        cmd.append(f"@{server}")
    try:
        out = subprocess.check_output(
            cmd, stderr=subprocess.STDOUT, text=True, timeout=DIG_TIMEOUT
        )
        return out.strip()
    except Exception:
        return ""


def parse_dig_answer(output: str) -> dict:
    """Parse la sortie dig pour extraire les infos clés."""
    result = {
        "status": None,
        "answer_count": 0,
        "authority_count": 0,
        "query_time_ms": None,
        "answers": [],
        "soa": None,
    }

    for line in output.splitlines():
        if "status:" in line:
            m = re.search(r"status:\s*(\w+)", line)
            if m:
                result["status"] = m.group(1)
        if "ANSWER:" in line:
            m = re.search(r"ANSWER:\s*(\d+)", line)
            if m:
                result["answer_count"] = int(m.group(1))
        if "Query time:" in line:
            m = re.search(r"Query time:\s*(\d+)", line)
            if m:
                result["query_time_ms"] = int(m.group(1))
        if ";; ANSWER SECTION:" in line:
            result["_in_answer"] = True
            continue
        if line.startswith(";;") and "ANSWER SECTION" not in line:
            result["_in_answer"] = False
        if result.get("_in_answer") and line and not line.startswith(";"):
            parts = line.split()
            if len(parts) >= 5:
                result["answers"].append({
                    "name": parts[0],
                    "ttl": parts[1],
                    "type": parts[3],
                    "value": " ".join(parts[4:]),
                })
        if "SOA" in line and "IN" in line:
            result["soa"] = line.strip()

    result.pop("_in_answer", None)
    return result


# ============================================
# ENDPOINTS
# ============================================

@router.post("/dig")
async def dig(payload: dict, user=Depends(get_current_user)):
    """
    Exécute une requête dig avec sortie complète + parsing.
    """
    domain = validate_domain(payload.get("domain", ""))
    qtype = validate_qtype(payload.get("type", "A"))
    server = validate_server(payload.get("server"))

    full = run_dig_full(domain, qtype, server)
    parsed = parse_dig_answer(full["output"]) if full["ok"] else {}

    audit_log(
        user.get("email", "system"),
        "diagnostics.dig",
        f"domain={domain} type={qtype} server={server or 'default'}",
    )

    return {
        "ok": full["ok"],
        "domain": domain,
        "type": qtype,
        "server": server,
        "raw": full["output"],
        "parsed": parsed,
    }


@router.post("/zone-check")
async def zone_check(payload: dict, user=Depends(get_current_user)):
    """Valide une zone avec named-checkzone."""
    zone = validate_zone_name(payload.get("zone", ""))

    zone_file = manager._get_zone_file(zone)
    if not zone_file:
        raise HTTPException(status_code=404, detail=f"Zone file not found for '{zone}'")

    try:
        out = subprocess.check_output(
            ["named-checkzone", zone, str(zone_file)],
            stderr=subprocess.STDOUT, text=True, timeout=CHECKZONE_TIMEOUT,
        )
        audit_log(user.get("email", "system"), "diagnostics.zone_check", f"zone={zone}")
        return {"ok": True, "zone": zone, "output": out}
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="named-checkzone timed out")
    except subprocess.CalledProcessError as e:
        return {"ok": False, "zone": zone, "output": e.output}
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="named-checkzone not installed")


@router.post("/validate-all")
async def validate_all(user=Depends(get_current_user)):
    """
    Valide TOUTES les zones master d'un coup.
    """
    zones = manager.list_zones()
    results = []

    for zone in zones:
        if zone.type != "master":
            continue
        try:
            ok, out = manager.validate_zone(zone.name)
            results.append({
                "zone": zone.name,
                "ok": ok,
                "output": out if not ok else "OK",
            })
        except BindManagerError as e:
            results.append({
                "zone": zone.name,
                "ok": False,
                "output": str(e),
            })

    total = len(results)
    passed = sum(1 for r in results if r["ok"])
    failed = total - passed

    audit_log(
        user.get("email", "system"),
        "diagnostics.validate_all",
        f"total={total} passed={passed} failed={failed}",
    )

    return {
        "ok": failed == 0,
        "total": total,
        "passed": passed,
        "failed": failed,
        "results": results,
    }


@router.post("/propagation")
async def propagation(payload: dict, user=Depends(get_current_user)):
    """
    Compare la propagation DNS entre primary et secondary :
    - SOA (serial)
    - Nombre de records
    - Checksum des records
    """
    zone = validate_zone_name(payload.get("zone", ""))
    primary = validate_server(payload.get("primary", "bind9")) or "bind9"
    secondary = validate_server(payload.get("secondary", "bind9-secondary")) or "bind9-secondary"

    # Requête SOA sur les deux serveurs
    primary_soa = run_dig_short(zone, "SOA", primary)
    secondary_soa = run_dig_short(zone, "SOA", secondary)

    # Extraire le serial
    def extract_serial(soa: str) -> int | None:
        if not soa:
            return None
        parts = soa.split()
        try:
            return int(parts[2]) if len(parts) >= 3 else None
        except (ValueError, IndexError):
            return None

    primary_serial = extract_serial(primary_soa)
    secondary_serial = extract_serial(secondary_soa)

    # Comparer
    in_sync = (
        primary_serial is not None
        and secondary_serial is not None
        and primary_serial == secondary_serial
    )

    audit_log(
        user.get("email", "system"),
        "diagnostics.propagation",
        f"zone={zone} primary={primary} secondary={secondary}",
    )

    return {
        "zone": zone,
        "primary": primary,
        "secondary": secondary,
        "in_sync": in_sync,
        "primary_serial": primary_serial,
        "secondary_serial": secondary_serial,
        "primary_soa": primary_soa,
        "secondary_soa": secondary_soa,
    }