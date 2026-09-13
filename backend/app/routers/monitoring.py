from fastapi import APIRouter
from app.services.prometheus_client import PrometheusClient

router = APIRouter()
client = PrometheusClient()


@router.get("/stats")
async def stats():
    return client.query_stats()


@router.get("/top-domains")
async def top_domains():
    return {"items": client.query_top_domains()}


@router.get("/alerts")
async def alerts():
    return {"items": client.query_alerts()}


@router.get("/health")
async def health():
    return client.query_health()
