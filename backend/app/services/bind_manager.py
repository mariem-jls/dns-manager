import os
import subprocess
from typing import List
from app.models.zone import Zone

class BindManager:
    def __init__(self, zones_path: str | None = None):
        self.zones_path = zones_path or os.environ.get("BIND_ZONES_PATH", "/etc/bind/zones")
        os.makedirs(self.zones_path, exist_ok=True)

    def list_zones(self) -> List[Zone]:
        zones = []
        for f in os.listdir(self.zones_path):
            if f.endswith('.db'):
                name = f.replace('.db','')
                zones.append(Zone(name=name, file=os.path.join(self.zones_path,f)))
        return zones

    def create_zone(self, name: str, ztype: str = 'master', description: str | None = None) -> Zone:
        fname = f"{name}.db"
        path = os.path.join(self.zones_path, fname)
        if os.path.exists(path):
            raise FileExistsError("Zone already exists")
        # Minimal SOA template
        content = f"$TTL 3600\n@ IN SOA ns1.{name}. admin.{name}. (\n    1 ; serial\n    3600 ; refresh\n    900 ; retry\n    604800 ; expire\n    3600 ; minimum\n)\n\n@ IN NS ns1.{name}.\nns1 IN A 127.0.0.1\n"
        with open(path, 'w') as fh:
            fh.write(content)
        return Zone(name=name, type=ztype, file=path, serial=1, description=description)

    def validate_zone(self, name: str) -> tuple[bool,str]:
        path = os.path.join(self.zones_path, f"{name}.db")
        if not os.path.exists(path):
            return False, "zone file not found"
        try:
            out = subprocess.check_output(['named-checkzone', name, path], stderr=subprocess.STDOUT, text=True)
            return True, out
        except subprocess.CalledProcessError as e:
            return False, e.output

    def reload(self) -> str:
        try:
            out = subprocess.check_output(['rndc', 'reload'], stderr=subprocess.STDOUT, text=True)
            return out
        except subprocess.CalledProcessError as e:
            return e.output
