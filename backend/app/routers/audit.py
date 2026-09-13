from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()
AUDIT_LOG_PATH = Path('/var/log/dynamix-audit.log')


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
    limit: int = Query(50, ge=1, le=200),
    actor: str | None = None,
    action: str | None = None,
):
    if not AUDIT_LOG_PATH.exists():
        return {'items': []}

    lines = AUDIT_LOG_PATH.read_text().splitlines()
    items = [parse_line(line) for line in reversed(lines)]

    if actor:
        items = [item for item in items if item.get('actor') == actor]
    if action:
        items = [item for item in items if item.get('action') == action]

    return {'items': items[:limit]}


@router.get('/logs/{log_id}')
async def get_log(log_id: int):
    if not AUDIT_LOG_PATH.exists():
        raise HTTPException(status_code=404, detail='Audit log file not found')

    lines = AUDIT_LOG_PATH.read_text().splitlines()
    if log_id < 0 or log_id >= len(lines):
        raise HTTPException(status_code=404, detail='Log entry not found')

    return parse_line(lines[log_id])