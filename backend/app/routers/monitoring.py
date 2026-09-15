from fastapi import APIRouter

from app.services.prometheus_client import PrometheusClient

router = APIRouter()
client = PrometheusClient()


@router.get("/stats")
async def stats():
    """
    Retourne les statistiques DNS.
    Si Prometheus ne répond pas, renvoie available:false avec un message clair.
    """
    data = client.query_stats()

    if not data.get("available", False):
        return {
            "available": False,
            "error": "prometheus_unavailable",
            "message": "Prometheus ne répond pas ou aucune métrique n'est disponible.",
            "request_rate": None,
            "cache_hit_rate": None,
            "latency_ms": None,
            "error_rate": None,
        }

    return data


@router.get("/top-domains")
async def top_domains():
    """
    Retourne les domaines les plus demandés.
    Renvoie available:false si Prometheus ne répond pas.
    """
    items = client.query_top_domains()

    if not items:
        return {
            "available": False,
            "items": [],
            "message": "Aucun domaine mesuré. Prometheus ne répond peut-être pas.",
        }

    return {"available": True, "items": items}


@router.get("/alerts")
async def alerts():
    """
    Retourne les alertes basées sur l'état de santé et les stats.
    """
    items = client.query_alerts()
    return {"available": True, "items": items}


@router.get("/health")
async def health():
    """
    Retourne l'état des services supervisés.
    'available' indique si Prometheus a répondu.
    """
    return client.query_health()