from fastapi import APIRouter, HTTPException
import subprocess

from app.config import settings

router = APIRouter()

@router.post("/dig")
async def dig(payload: dict):
    domain = payload.get('domain')
    qtype = payload.get('type','A')
    server = payload.get('server')
    cmd = ['dig', '+short', domain, qtype]
    if server:
        cmd += ['@' + server]
    try:
        out = subprocess.check_output(cmd, text=True)
        return {"output": out}
    except subprocess.CalledProcessError as e:
        return {"error": e.output}

@router.post('/zone-check')
async def zone_check(payload: dict):
    zone = payload.get('zone')
    path = payload.get('path')
    if not zone:
        raise HTTPException(status_code=400, detail='zone is required')
    if not path:
        path = f"{settings.bind_zones_path}/{zone}.db"
    try:
        out = subprocess.check_output(['named-checkzone', zone, path], text=True)
        return {"ok": True, "output": out}
    except subprocess.CalledProcessError as e:
        return {"ok": False, "output": e.output}


@router.post('/propagation')
async def propagation(payload: dict):
    zone = payload.get('zone')
    primary = payload.get('primary', 'bind9')
    secondary = payload.get('secondary', 'bind9-secondary')
    if not zone:
        raise HTTPException(status_code=400, detail='zone is required')

    def dig(server: str) -> str:
        try:
            return subprocess.check_output(['dig', '+short', f'@{server}', zone, 'SOA'], text=True).strip()
        except subprocess.CalledProcessError:
            return ''

    primary_answer = dig(primary)
    secondary_answer = dig(secondary)

    return {
        'zone': zone,
        'primary': primary,
        'secondary': secondary,
        'in_sync': bool(primary_answer) and primary_answer == secondary_answer,
        'primary_answer': primary_answer,
        'secondary_answer': secondary_answer,
    }
