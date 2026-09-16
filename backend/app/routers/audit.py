from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()
AUDIT_LOG_PATH = Path('/var/log/dynamix/audit.log')


def parse_line(line: str) -> dict:
    timestamp, _, rest = line.partition(' ')
    level, _, payload = rest.partition(' ')
    fields = {'timestamp': timestamp, 'level': level or 'INFO', 'raw': payload.strip()}
    for chunk in payload.split():
        if '=' in chunk:
            key, value = chunk.split('=', 1)
            fields[key] = value
    return fields


@router.get('/logs')
async def list_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    actor: str | None = None,
    action: str | None = None,
    search: str | None = None,
):
    if not AUDIT_LOG_PATH.exists():
        return {"items": [], "total": 0, "skip": skip, "limit": limit, "has_more": False}

    lines = AUDIT_LOG_PATH.read_text().splitlines()
    items = [parse_line(line) for line in reversed(lines)]

    if actor:
        items = [item for item in items if item.get('actor') == actor]
    if action:
        items = [item for item in items if item.get('action') == action]
    if search:
        search_lower = search.lower()
        items = [item for item in items if search_lower in item.get('raw', '').lower()]

    total = len(items)
    items = items[skip : skip + limit]

    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
        "has_more": skip + limit < total,
    }