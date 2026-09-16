"""
Client Supabase pour la gestion des métadonnées DNS.

Supabase sert à stocker ce que BIND ne peut pas stocker :
- Description des zones
- Propriétaire / créateur
- Dates de création / modification
- Historique des actions (audit)
"""

from typing import Any

from supabase import create_client, Client

from app.config import settings


class SupabaseError(Exception):
    """Exception métier pour les erreurs Supabase."""
    pass


class SupabaseClient:
    """
    Client Supabase avec le service_role key.
    ⚠️ Utiliser uniquement côté backend (jamais exposer au frontend).
    """

    def __init__(
        self,
        url: str | None = None,
        key: str | None = None,
    ):
        self.url = url or settings.supabase_url
        self.key = key or settings.supabase_service_key

        if not self.url or not self.key:
            raise SupabaseError(
                "Supabase URL and service key are required. "
                "Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env"
            )

        self.client: Client = create_client(self.url, self.key)

    # ============================================
    # ZONES
    # ============================================
    def list_zones(self) -> list[dict[str, Any]]:
        """Liste toutes les métadonnées de zones."""
        try:
            response = self.client.table("dns_zones").select("*").execute()
            return response.data or []
        except Exception as e:
            raise SupabaseError(f"Failed to list zones: {e}")

    def get_zone(self, name: str) -> dict[str, Any] | None:
        """Récupère les métadonnées d'une zone par son nom."""
        try:
            response = (
                self.client.table("dns_zones")
                .select("*")
                .eq("name", name)
                .limit(1)
                .execute()
            )
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            raise SupabaseError(f"Failed to get zone '{name}': {e}")
    def create_zone(
        self,
        name: str,
        ztype: str = "master",
        description: str | None = None,
        created_by: str | None = None,
    ) -> dict[str, Any]:
        """Crée les métadonnées d'une zone."""
        try:
            data = {
                "name": name,
                "type": ztype,
                "description": description,
                "created_by": created_by,
            }
            response = self.client.table("dns_zones").insert(data).execute()
            if not response.data:
                raise SupabaseError("Insert returned no data")
            return response.data[0]
        except Exception as e:
            raise SupabaseError(f"Failed to create zone '{name}': {e}")

    def update_zone(
        self,
        name: str,
        description: str | None = None,
    ) -> dict[str, Any] | None:
        """Met à jour les métadonnées d'une zone."""
        try:
            data: dict[str, Any] = {}
            if description is not None:
                data["description"] = description

            if not data:
                return self.get_zone(name)

            response = (
                self.client.table("dns_zones")
                .update(data)
                .eq("name", name)
                .execute()
            )
            if not response.data:
                return None
            return response.data[0]
        except Exception as e:
            raise SupabaseError(f"Failed to update zone '{name}': {e}")

    def delete_zone(self, name: str) -> bool:
        """Supprime les métadonnées d'une zone."""
        try:
            response = (
                self.client.table("dns_zones")
                .delete()
                .eq("name", name)
                .execute()
            )
            return bool(response.data)
        except Exception as e:
            raise SupabaseError(f"Failed to delete zone '{name}': {e}")

    # ============================================
    # AUDIT LOGS
    # ============================================
    def log_action(
        self,
        actor: str,
        action: str,
        details: str | None = None,
    ) -> None:
        """Enregistre une action dans l'audit log Supabase."""
        try:
            self.client.table("audit_logs").insert({
                "actor": actor,
                "action": action,
                "details": details,
            }).execute()
        except Exception as e:
            # On ne veut pas crasher si l'audit log échoue
            print(f"WARNING: Failed to log action to Supabase: {e}")

    # ============================================
    # USERS
    # ============================================
    def list_users(self) -> list[dict[str, Any]]:
        """Liste les profils utilisateurs."""
        try:
            response = self.client.table("user_profiles").select("*").execute()
            return response.data or []
        except Exception as e:
            raise SupabaseError(f"Failed to list users: {e}")

    def get_user(self, user_id: str) -> dict[str, Any] | None:
        """Récupère un profil utilisateur."""
        try:
            response = (
                self.client.table("user_profiles")
                .select("*")
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            raise SupabaseError(f"Failed to get user '{user_id}': {e}")

_supabase_client: SupabaseClient | None = None


def get_supabase_client() -> SupabaseClient:
    """Retourne l'instance globale (lazy loading)."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = SupabaseClient()
    return _supabase_client