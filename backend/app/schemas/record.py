from pydantic import BaseModel, Field, field_validator
import re
from datetime import datetime

# Types d'enregistrement supportés
ALLOWED_RECORD_TYPES = {
    "A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "PTR", "CAA",
}

# Regex de validation de nom d'hôte
HOSTNAME_REGEX = re.compile(
    r"^(@|\*|[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*)$",
    re.IGNORECASE,
)


class RecordCreate(BaseModel):
    name: str = Field(..., description="Nom relatif (@ pour la racine)")
    type: str = Field(..., description="Type DNS (A, AAAA, CNAME, ...)")
    value: str = Field(..., description="Valeur (IP, FQDN, texte, ...)")
    ttl: int = Field(default=3600, ge=0, le=604800)
    priority: int | None = Field(default=None, ge=0, le=65535, description="Pour MX/SRV")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        if not HOSTNAME_REGEX.match(v):
            raise ValueError(f"Invalid record name: {v}")
        return v.lower()

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        v = v.strip().upper()
        if v not in ALLOWED_RECORD_TYPES:
            raise ValueError(
                f"Invalid type. Allowed: {', '.join(sorted(ALLOWED_RECORD_TYPES))}"
            )
        return v

    @field_validator("value")
    @classmethod
    def validate_value(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Value is required")
        if len(v) > 512:
            raise ValueError("Value too long (max 512)")
        # Interdire les caractères dangereux (injection dans le fichier de zone)
        if any(c in v for c in ["\n", "\r", "\x00"]):
            raise ValueError("Invalid characters in value")
        return v


class RecordRead(BaseModel):
    id: str                              # identifiant unique (hash du contenu)
    name: str
    type: str
    value: str
    ttl: int
    priority: int | None = None
    line: int = -1                       # numéro de ligne dans le fichier
    created_by: str | None = None        # ← AJOUTÉ (Supabase)
    created_at: datetime | None = None   # ← AJOUTÉ (Supabase)