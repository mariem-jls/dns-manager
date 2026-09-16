from fastapi import APIRouter

from app.services.prometheus_client import PrometheusClient

router = APIRouter()
client = PrometheusClient()


@router.get("/stats")
async def stats():
    data = client.query_stats()
    if not data.get('available', False):
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
    items = client.query_top_domains()
    if not items:
        return {
            "available": False,
            "items": [],
            "message": "Statistiques par domaine non exposées par bind_exporter.",
        }
    return {"available": True, "items": items}


@router.get("/alerts")
async def alerts():
    items = client.query_alerts()
    return {"available": True, "items": items}


@router.get("/health")
async def health():
    return client.query_health()


@router.get("/series")
async def series(duration_min: int = 30, step: int = 60):
    """Série temporelle de requêtes/sec."""
    items = client.query_series(duration_min=duration_min, step=step)
    if not items:
        return {
            "available": False,
            "items": [],
            "message": "Aucune série temporelle disponible.",
        }
    return {"available": True, "items": items}


@router.get("/traffic-distribution")
async def traffic_distribution():
    """Répartition des requêtes par type DNS."""
    items = client.query_traffic_distribution()
    if not items:
        return {
            "available": False,
            "items": [],
            "message": "Aucune donnée de répartition disponible.",
        }
    return {"available": True, "items": items}