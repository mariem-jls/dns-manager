from fastapi import APIRouter, Depends

from app.services.prometheus_client import PrometheusClient
from app.dependencies import get_current_user

router = APIRouter()
client = PrometheusClient()


@router.get("/stats")
async def stats(user=Depends(get_current_user)):
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
async def top_domains(user=Depends(get_current_user)):
    items = client.query_top_domains()
    if not items:
        return {
            "available": False,
            "items": [],
            "message": "Statistiques par domaine non exposées par bind_exporter.",
        }
    return {"available": True, "items": items}


@router.get("/alerts")
async def alerts(user=Depends(get_current_user)):
    items = client.query_alerts()
    return {"available": True, "items": items}


@router.get("/health")
async def health(user=Depends(get_current_user)):
    return client.query_health()


@router.get("/bind-info")
async def bind_info(user=Depends(get_current_user)):
    """Retourne uptime et version de BIND."""
    return client.query_bind_info()


@router.get("/series")
async def series(duration_min: int = 30, step: int = 60, user=Depends(get_current_user)):
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
async def traffic_distribution(user=Depends(get_current_user)):
    """Répartition des requêtes par type DNS."""
    items = client.query_traffic_distribution()
    if not items:
        return {
            "available": False,
            "items": [],
            "message": "Aucune donnée de répartition disponible.",
        }
    return {"available": True, "items": items}