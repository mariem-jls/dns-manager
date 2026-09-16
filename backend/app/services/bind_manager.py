import os
import re
import subprocess
from pathlib import Path
from typing import List

from app.models.zone import Zone

# Regex stricte pour les noms de zone DNS
# - Lettres, chiffres, tirets, points
# - Doit commencer et finir par un alphanumérique
# - Longueur max 253 (limite DNS)
ZONE_NAME_REGEX = re.compile(
    r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$"
)

# Types de zone autorisés
ALLOWED_ZONE_TYPES = {"master", "slave"}


class BindManagerError(Exception):
    """Exception métier pour les erreurs BIND."""
    pass


class BindManager:
    def __init__(
        self,
        zones_path: str | None = None,
        config_path: str | None = None,
        rndc_command: str = "rndc",
    ):
        self.zones_path = Path(
            zones_path or os.environ.get("BIND_ZONES_PATH", "/etc/bind/zones")
        )
        self.config_path = Path(
            config_path or os.environ.get("BIND_CONFIG_PATH", "/etc/bind/named.conf.local")
        )
        self.rndc_command = rndc_command
        self.zones_path.mkdir(parents=True, exist_ok=True)

    # ============================================
    # VALIDATION
    # ============================================
    @staticmethod
    def validate_zone_name(name: str) -> str:
        """
        Valide un nom de zone DNS.
        Lève BindManagerError si invalide.
        Retourne le nom normalisé (lowercase, sans point final).
        """
        if not name or not isinstance(name, str):
            raise BindManagerError("Zone name is required")

        normalized = name.strip().lower().rstrip(".")

        if not ZONE_NAME_REGEX.match(normalized):
            raise BindManagerError(
                f"Invalid zone name: '{name}'. "
                "Must be a valid domain (letters, digits, hyphens, dots)."
            )

        # Protection supplémentaire contre path traversal
        if ".." in normalized or "/" in normalized or "\\" in normalized:
            raise BindManagerError("Invalid characters in zone name")

        return normalized

    @staticmethod
    def validate_zone_type(ztype: str) -> str:
        if ztype not in ALLOWED_ZONE_TYPES:
            raise BindManagerError(
                f"Invalid zone type: '{ztype}'. "
                f"Allowed: {', '.join(sorted(ALLOWED_ZONE_TYPES))}"
            )
        return ztype

    # ============================================
    # LECTURE
    # ============================================
    def list_zones(self) -> List[Zone]:
        """Liste les zones en parsant named.conf.local (source de vérité)."""
        zones: List[Zone] = []
        if not self.config_path.exists():
            return zones

        content = self.config_path.read_text()

        # Regex pour matcher les blocs zone
        # zone "dynamix.com" { type master; file "..."; ... };
        pattern = re.compile(
            r'zone\s+"([^"]+)"\s*\{(.*?)\};',
            re.MULTILINE | re.DOTALL,
        )

        for match in pattern.finditer(content):
            name = match.group(1)
            body = match.group(2)

            # Extraire le type
            type_match = re.search(r'type\s+(\w+);', body)
            ztype = type_match.group(1) if type_match else "master"

            # Extraire le fichier
            file_match = re.search(r'file\s+"([^"]+)";', body)
            file_path = file_match.group(1) if file_match else None

            # Lire le serial si le fichier existe
            serial = 1
            if file_path:
                # Le fichier dans named.conf.local est /var/lib/bind/...
                # mais dans le backend c'est monté sur /etc/bind/zones/
                local_name = Path(file_path).name
                local_path = self.zones_path / local_name
                if local_path.exists():
                    serial = self._read_serial(local_path)
                    file_path = str(local_path)

            zones.append(
                Zone(
                    name=name,
                    type=ztype,
                    file=file_path,
                    serial=serial,
                )
            )

        return zones

    def get_zone(self, name: str) -> Zone | None:
        """Récupère une zone par son nom."""
        normalized = self.validate_zone_name(name)
        for zone in self.list_zones():
            if zone.name == normalized:
                return zone
        return None

    @staticmethod
    def _read_serial(path: Path) -> int:
        """Lit le serial SOA dans un fichier de zone."""
        try:
            content = path.read_text()
            # Cherche la première ligne après SOA qui contient un nombre
            match = re.search(
                r"SOA\s+\S+\s+\S+\s*\(\s*(\d+)", content, re.IGNORECASE | re.DOTALL
            )
            if match:
                return int(match.group(1))
        except Exception:
            pass
        return 1

    # ============================================
    # CRÉATION
    # ============================================
    def create_zone(
        self,
        name: str,
        ztype: str = "master",
        description: str | None = None,
        masters: list[str] | None = None,
    ) -> Zone:
        """
        Crée une zone DNS.

        - type=master : crée le fichier .db avec un template SOA
        - type=slave  : ne crée PAS de fichier (BIND le fera lors du transfert)
        """
        normalized = self.validate_zone_name(name)
        ztype = self.validate_zone_type(ztype)

        # Vérifier si la zone existe déjà dans la config
        if self._zone_in_config(normalized):
            raise BindManagerError(f"Zone '{normalized}' already exists in config")

        zone_file = self.zones_path / f"{normalized}.db"

        if ztype == "master":
            if zone_file.exists():
                raise BindManagerError(f"Zone file '{zone_file}' already exists")
            content = self._generate_soa_template(normalized)
            zone_file.write_text(content)

        # Ajouter à named.conf.local
        self._add_zone_to_config(normalized, ztype, masters=masters)

        # Recharger BIND
        self.reload()

        return Zone(
            name=normalized,
            type=ztype,
            file=str(zone_file) if ztype == "master" else None,
            serial=1 if ztype == "master" else 0,
            description=description,
        )

    def _generate_soa_template(self, name: str) -> str:
        """Génère un template SOA minimal."""
        return (
            f"$TTL 3600\n"
            f"@   IN  SOA ns1.{name}. admin.{name}. (\n"
            f"        1       ; serial\n"
            f"        3600    ; refresh\n"
            f"        900     ; retry\n"
            f"        604800  ; expire\n"
            f"        3600    ; minimum\n"
            f")\n\n"
            f"@   IN  NS  ns1.{name}.\n"
            f"ns1 IN  A   127.0.0.1\n"
        )

    # ============================================
    # SUPPRESSION
    # ============================================
    def delete_zone(self, name: str) -> bool:
        """Supprime une zone (config + fichier .db)."""
        normalized = self.validate_zone_name(name)

        # Retirer de named.conf.local
        removed = self._remove_zone_from_config(normalized)

        # Supprimer le fichier .db
        zone_file = self.zones_path / f"{normalized}.db"
        if zone_file.exists():
            zone_file.unlink()

        # Supprimer aussi les .jnl (journal)
        jnl = self.zones_path / f"{normalized}.db.jnl"
        if jnl.exists():
            jnl.unlink()

        if removed:
            self.reload()

        return removed

    # ============================================
    # MISE À JOUR
    # ============================================
    def update_zone(self, name: str, description: str | None = None) -> Zone | None:
        """
        Met à jour une zone.
        Actuellement, seul le champ 'description' est supporté côté Supabase
        (on ne touche pas au fichier .db ici).
        """
        normalized = self.validate_zone_name(name)
        zone = self.get_zone(normalized)
        if not zone:
            raise BindManagerError(f"Zone '{normalized}' not found")

        # La description sera mise à jour côté Supabase par le router
        zone.description = description
        return zone

    # ============================================
    # VALIDATION BIND
    # ============================================
    def validate_zone(self, name: str) -> tuple[bool, str]:
        """Valide une zone avec named-checkzone."""
        normalized = self.validate_zone_name(name)
        path = self.zones_path / f"{normalized}.db"
        if not path.exists():
            return False, f"Zone file not found: {path}"

        try:
            out = subprocess.check_output(
                ["named-checkzone", normalized, str(path)],
                stderr=subprocess.STDOUT,
                text=True,
                timeout=10,
            )
            return True, out
        except subprocess.CalledProcessError as e:
            return False, e.output
        except subprocess.TimeoutExpired:
            return False, "named-checkzone timeout"

    # ============================================
    # RELOAD BIND
    # ============================================
    def reload(self) -> str:
        """Recharge BIND via rndc. Non-bloquant."""
        try:
            out = subprocess.check_output(
                [self.rndc_command, "reload"],
                stderr=subprocess.STDOUT,
                text=True,
                timeout=15,
            )
            return out
        except FileNotFoundError:
            return "WARNING: rndc not installed. Reload manually: docker exec dns-primary rndc reload"
        except subprocess.CalledProcessError as e:
            return f"WARNING: rndc reload failed: {e.output}. Reload manually."
        except subprocess.TimeoutExpired:
            return "WARNING: rndc reload timeout. Reload manually."
    # ============================================
    # MANIPULATION DE named.conf.local
    # ============================================
    def _zone_in_config(self, name: str) -> bool:
        """Vérifie si la zone est déjà dans named.conf.local."""
        if not self.config_path.exists():
            return False
        content = self.config_path.read_text()
        return f'zone "{name}"' in content

    def _add_zone_to_config(
        self,
        name: str,
        ztype: str,
        masters: list[str] | None = None,
    ) -> None:
        """Ajoute une zone à named.conf.local."""
        if self._zone_in_config(name):
            return

        if ztype == "master":
            block = (
                f'\nzone "{name}" {{\n'
                f'    type master;\n'
                f'    file "/var/lib/bind/{name}.db";\n'
                f'    notify yes;\n'
                f'    allow-transfer {{ key "axfr-key"; }};\n'
                f'}};\n'
            )
        else:  # slave
            masters_list = " ".join(masters) if masters else "bind9"
            block = (
                f'\nzone "{name}" {{\n'
                f'    type slave;\n'
                f'    masters {{ {masters_list} port 53; }};\n'
                f'    file "/var/lib/bind/{name}.db";\n'
                f'}};\n'
            )

        with self.config_path.open("a") as fh:
            fh.write(block)

    def _remove_zone_from_config(self, name: str) -> bool:
        """Retire une zone de named.conf.local."""
        if not self.config_path.exists():
            return False

        content = self.config_path.read_text()
        # Regex pour matcher un bloc zone complet
        pattern = re.compile(
            rf'\n?zone\s+"{re.escape(name)}"\s*\{{[^}}]*\}};\s*\n?',
            re.MULTILINE | re.DOTALL,
        )
        new_content, count = pattern.subn("\n", content)

        if count == 0:
            return False

        self.config_path.write_text(new_content)
        return True