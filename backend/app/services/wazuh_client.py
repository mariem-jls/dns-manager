import httpx
from app.config import settings

class WazuhClient:
    def __init__(self, base_url: str | None = None, user: str | None = None, password: str | None = None):
        self.base_url = base_url or settings.wazuh_url
        self.auth = (user, password)

    def list_agents(self):
        try:
            r = httpx.get(f"{self.base_url}/agents", timeout=10.0)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            return {"error": str(e)}
