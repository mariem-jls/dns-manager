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
        normalized = self.validate_zone_name(name)
        ztype = self.validate_zone_type(ztype)

        if self._zone_in_config(normalized):
            raise BindManagerError(f"Zone '{normalized}' already exists in config")

        # Utiliser le format db.{name} comme les autres zones
        zone_file = self.zones_path / f"db.{normalized}"

        if ztype == "master":
            if zone_file.exists():
                raise BindManagerError(f"Zone file '{zone_file}' already exists")
            content = self._generate_soa_template(normalized)
            zone_file.write_text(content)

        # Ajouter à named.conf.local avec le bon chemin
        self._add_zone_to_config(normalized, ztype, masters=masters)

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

        # Supprimer le fichier .db (avec _get_zone_file qui gère les 3 formats)
        zone_file = self._get_zone_file(normalized)
        if zone_file and zone_file.exists():
            zone_file.unlink()

        # Supprimer aussi les .jnl (journal)
        for jnl_name in [
            f"{normalized}.db.jnl",
            f"db.{normalized}.db.jnl",
            f"db.{normalized}.jnl",
        ]:
            jnl = self.zones_path / jnl_name
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
        
        # Utiliser _get_zone_file qui gère les 3 formats
        path = self._get_zone_file(normalized)
        if not path:
            return False, f"Zone file not found for '{normalized}'"

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
                f'    file "/var/lib/bind/db.{name}";\n'   # ← db.{name} au lieu de {name}.db
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
                f'    file "/var/lib/bind/db.{name}";\n'   # ← db.{name}
                f'}};\n'
            )

        with self.config_path.open("a") as fh:
            fh.write(block)

    # ============================================
    # RECORDS
    # ============================================
    def list_records(self, zone_name: str) -> list[dict]:
        """
        Parse les enregistrements d'une zone.
        Ignore SOA, NS de base, et les commentaires.
        """
        normalized = self.validate_zone_name(zone_name)
        
        # Utiliser _get_zone_file qui gère les 3 formats
        zone_file = self._get_zone_file(normalized)
        if not zone_file:
            raise BindManagerError(f"Zone file not found for '{normalized}'")

        records: list[dict] = []
        lines = zone_file.read_text().splitlines()

        for idx, raw_line in enumerate(lines):
            # Retirer les commentaires
            line = raw_line.split(";")[0].strip()
            if not line:
                continue

            # Ignorer SOA, $TTL, $ORIGIN, directives
            if line.startswith("$") or "SOA" in line.upper():
                continue

            # Parser : name [ttl] [IN] type value [priority]
            tokens = line.split()
            if len(tokens) < 3:
                continue

            name = tokens[0]
            remaining = tokens[1:]

            # Retirer "IN" s'il est en premier (format : name IN A value)
            if remaining and remaining[0].upper() == "IN":
                remaining = remaining[1:]

            # Chercher le TTL (nombre en début)
            ttl = 3600
            if remaining and remaining[0].isdigit():
                ttl = int(remaining[0])
                remaining = remaining[1:]

            # Retirer "IN" à nouveau (format : name TTL IN A value)
            if remaining and remaining[0].upper() == "IN":
                remaining = remaining[1:]

            if len(remaining) < 2:
                continue

            rtype = remaining[0].upper()
            if rtype not in ("A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "PTR", "CAA"):
                continue

            # Valeur : tout le reste
            value_tokens = remaining[1:]

            # Gérer MX/SRV avec priorité en premier
            priority = None
            if rtype in ("MX", "SRV") and value_tokens and value_tokens[0].isdigit():
                priority = int(value_tokens[0])
                value_tokens = value_tokens[1:]

            value = " ".join(value_tokens).strip('"')

            # Générer un ID stable (hash)
            rec_id = f"{name}|{rtype}|{value}".lower().replace(" ", "_")

            records.append({
                "id": rec_id,
                "name": name,
                "type": rtype,
                "value": value,
                "ttl": ttl,
                "priority": priority,
                "line": idx,
            })

        return records

    def add_record(
        self,
        zone_name: str,
        name: str,
        rtype: str,
        value: str,
        ttl: int = 3600,
        priority: int | None = None,
    ) -> dict:
        """Ajoute un enregistrement à une zone (évite les doublons)."""
        normalized = self.validate_zone_name(zone_name)
        zone_file = self._get_zone_file(normalized)
        if not zone_file:
            raise BindManagerError(f"Zone file not found for '{normalized}'")

        rtype = rtype.upper()

        # VÉRIFIER SI LE RECORD EXISTE DÉJÀ
        existing = self.list_records(normalized)
        for rec in existing:
            if rec['name'] == name and rec['type'] == rtype and rec['value'] == value:
                raise BindManagerError(
                    f"Record '{name} {rtype} {value}' already exists"
                )

        # Construire la ligne
        if rtype in ("MX", "SRV") and priority is not None:
            line = f"{name}\t{ttl}\tIN\t{rtype}\t{priority}\t{value}"
        else:
            line = f"{name}\t{ttl}\tIN\t{rtype}\t{value}"

        # Ajouter au fichier
        with zone_file.open("a") as fh:
            fh.write("\n" + line + "\n")

        # Incrémenter le serial
        self._increment_serial(zone_file)

        # Recharger BIND
        self.reload()

        # Générer l'ID
        rec_id = f"{name}|{rtype}|{value}".lower().replace(" ", "_")

        return {
            "id": rec_id,
            "name": name,
            "type": rtype,
            "value": value,
            "ttl": ttl,
            "priority": priority,
            "line": -1,
        }

    def delete_record(self, zone_name: str, record_id: str) -> bool:
        """
        Supprime un enregistrement par son ID.
        Incrémente le serial SOA et recharge BIND.
        """
        normalized = self.validate_zone_name(zone_name)
        zone_file = self._get_zone_file(normalized)
        if not zone_file:
            raise BindManagerError(f"Zone file not found for '{normalized}'")

        # Retrouver la ligne
        records = self.list_records(normalized)
        target = next((r for r in records if r["id"] == record_id), None)
        if not target:
            return False

        # Lire les lignes
        lines = zone_file.read_text().splitlines()
        line_idx = target["line"]
        if line_idx < 0 or line_idx >= len(lines):
            return False

        # Supprimer la ligne
        del lines[line_idx]

        # Réécrire le fichier
        zone_file.write_text("\n".join(lines) + "\n")

        # Incrémenter le serial
        self._increment_serial(zone_file)

        # Recharger BIND
        self.reload()

        return True

    # ============================================
    # HELPERS
    # ============================================
    def _get_zone_file(self, zone_name: str) -> Path | None:
        """
        Trouve le fichier de zone.
        Formats supportés :
        - dynamix.com.db
        - db.dynamix.com.db
        - db.dynamix.com
        """
        candidates = [
            self.zones_path / f"{zone_name}.db",        # dynamix.com.db
            self.zones_path / f"db.{zone_name}.db",     # db.dynamix.com.db
            self.zones_path / f"db.{zone_name}",        # db.dynamix.com ← AJOUTER
        ]
        for candidate in candidates:
            if candidate.exists():
                return candidate
        return None

    def _increment_serial(self, zone_file: Path) -> None:
        """Incrémente le serial SOA dans le fichier."""
        content = zone_file.read_text()
        # Chercher la première ligne après SOA qui contient un nombre
        match = re.search(
            r"(SOA\s+\S+\s+\S+\s*\(\s*)(\d+)",
            content,
            re.IGNORECASE | re.DOTALL,
        )
        if not match:
            return
        old_serial = int(match.group(2))
        new_serial = old_serial + 1
        new_content = content[: match.start(2)] + str(new_serial) + content[match.end(2):]
        zone_file.write_text(new_content)

    def _remove_zone_from_config(self, name: str) -> bool:
        """
        Retire une zone de named.conf.local.
        Utilise un compteur d'accolades pour gérer les blocs imbriqués.
        """
        if not self.config_path.exists():
            return False

        content = self.config_path.read_text()
        lines = content.splitlines()
        
        # Trouver le début du bloc zone
        start_idx = None
        for i, line in enumerate(lines):
            if re.match(rf'^\s*zone\s+"{re.escape(name)}"\s*\{{', line):
                start_idx = i
                break
        
        if start_idx is None:
            return False
        
        # Trouver la fin du bloc (compteur d'accolades)
        brace_count = 0
        end_idx = None
        for i in range(start_idx, len(lines)):
            brace_count += lines[i].count('{')
            brace_count -= lines[i].count('}')
            if brace_count == 0 and i > start_idx:
                end_idx = i
                break
        
        if end_idx is None:
            return False
        
        # Supprimer les lignes du bloc
        del lines[start_idx:end_idx + 1]
        
        # Nettoyer les lignes vides multiples
        new_content = '\n'.join(lines)
        new_content = re.sub(r'\n{3,}', '\n\n', new_content)
        
        self.config_path.write_text(new_content)
        return True