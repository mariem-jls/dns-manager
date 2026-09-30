"""
Client Supabase pour la gestion des métadonnées DNS.

Utilise httpx pour les opérations DB (bypass RLS garanti).
Utilise le SDK Supabase uniquement pour l'authentification.
"""

from typing import Any

import httpx

from supabase import create_client, Client

from app.config import settings


class SupabaseError(Exception):
    """Exception métier pour les erreurs Supabase."""
    pass


class SupabaseClient:
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

        # Client SDK uniquement pour l'auth
        self.client: Client = create_client(self.url, self.key)

    # ============================================
    # REST HELPERS (httpx)
    # ============================================
    def _rest_headers(self) -> dict:
        return {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def _rest_get(self, table: str, params: dict | None = None) -> list[dict]:
        """Requête GET directe à l'API REST Supabase (bypass RLS garanti)."""
        url = f"{self.url}/rest/v1/{table}"
        response = httpx.get(
            url,
            headers=self._rest_headers(),
            params=params or {},
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()

    def _rest_post(self, table: str, data: dict) -> dict:
        """Requête POST directe à l'API REST Supabase."""
        url = f"{self.url}/rest/v1/{table}"
        headers = self._rest_headers()
        headers["Prefer"] = "return=representation"
        response = httpx.post(url, headers=headers, json=data, timeout=10.0)
        response.raise_for_status()
        result = response.json()
        return result[0] if result else {}

    def _rest_patch(self, table: str, params: dict, data: dict) -> list[dict]:
        """Requête PATCH directe à l'API REST Supabase."""
        url = f"{self.url}/rest/v1/{table}"
        headers = self._rest_headers()
        headers["Prefer"] = "return=representation"
        response = httpx.patch(
            url, headers=headers, params=params, json=data, timeout=10.0
        )
        response.raise_for_status()
        return response.json()

    def _rest_delete(self, table: str, params: dict) -> bool:
        """Requête DELETE directe à l'API REST Supabase."""
        url = f"{self.url}/rest/v1/{table}"
        response = httpx.delete(
            url, headers=self._rest_headers(), params=params, timeout=10.0
        )
        response.raise_for_status()
        return True

    # ============================================
    # AUTH (utilise le SDK Supabase)
    # ============================================
    def sign_in(self, email: str, password: str) -> dict[str, Any]:
        """Connecte un utilisateur via Supabase Auth."""
        try:
            response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password,
            })
            if not response.user or not response.session:
                raise SupabaseError("Invalid credentials")
            return {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_at": response.session.expires_at,
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                },
            }
        except Exception as e:
            raise SupabaseError(f"Sign in failed: {e}")

    def sign_out(self, access_token: str) -> None:
        """Déconnecte un utilisateur."""
        try:
            self.client.auth.admin.sign_out(access_token)
        except Exception as e:
            print(f"WARNING: Sign out failed: {e}")

    def get_user_from_token(self, access_token: str) -> dict[str, Any] | None:
        """Vérifie un JWT Supabase et retourne l'utilisateur."""
        try:
            response = self.client.auth.get_user(access_token)
            if not response or not response.user:
                return None

            email = response.user.email
            if not email:
                # Fallback : décoder le JWT manuellement
                import base64
                import json
                try:
                    payload = access_token.split('.')[1]
                    padding = 4 - (len(payload) % 4)
                    payload += '=' * padding
                    decoded = json.loads(base64.urlsafe_b64decode(payload))
                    email = decoded.get('email')
                except Exception:
                    email = None

            return {
                "id": response.user.id,
                "email": email,
            }
        except Exception as e:
            print(f"DEBUG get_user_from_token error: {e}", flush=True)
            return None

    # ============================================
    # PROFILES (httpx)
    # ============================================
    def get_profile(self, user_id: str) -> dict[str, Any] | None:
        """Récupère le profil (rôle) via REST."""
        try:
            data = self._rest_get(
                "user_profiles",
                {"id": f"eq.{user_id}", "limit": 1},
            )
            return data[0] if data else None
        except Exception as e:
            print(f"DEBUG get_profile error: {e}", flush=True)
            return None

    def create_profile(
        self, user_id: str, email: str, role: str = "viewer"
    ) -> dict[str, Any]:
        """Crée un profil utilisateur."""
        try:
            return self._rest_post("user_profiles", {
                "id": user_id,
                "email": email,
                "role": role,
            })
        except Exception as e:
            raise SupabaseError(f"Failed to create profile: {e}")

    def invite_user(self, email: str, role: str = "viewer") -> dict[str, Any]:
        """Invite un utilisateur par email."""
        try:
            response = self.client.auth.admin.invite_user_by_email(
                email,
                options={"data": {"role": role}},
            )
            if not response.user:
                raise SupabaseError("Invite failed")

            user_id = response.user.id
            try:
                self.create_profile(user_id=user_id, email=email, role=role)
            except SupabaseError:
                # Profil existe déjà → mise à jour du rôle
                self._rest_patch(
                    "user_profiles",
                    {"id": f"eq.{user_id}"},
                    {"role": role},
                )

            return {"id": user_id, "email": email, "role": role}
        except Exception as e:
            raise SupabaseError(f"Failed to invite user: {e}")

    # ============================================
    # ZONES (httpx)
    # ============================================
    def list_zones(self) -> list[dict[str, Any]]:
        """Liste toutes les métadonnées de zones."""
        try:
            return self._rest_get("dns_zones")
        except Exception as e:
            raise SupabaseError(f"Failed to list zones: {e}")

    def get_zone(self, name: str) -> dict[str, Any] | None:
        """Récupère les métadonnées d'une zone par son nom."""
        try:
            data = self._rest_get(
                "dns_zones",
                {"name": f"eq.{name}", "limit": 1},
            )
            return data[0] if data else None
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
            return self._rest_post("dns_zones", {
                "name": name,
                "type": ztype,
                "description": description,
                "created_by": created_by,
            })
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

            result = self._rest_patch(
                "dns_zones",
                {"name": f"eq.{name}"},
                data,
            )
            return result[0] if result else None
        except Exception as e:
            raise SupabaseError(f"Failed to update zone '{name}': {e}")

    def delete_zone(self, name: str) -> bool:
        """Supprime les métadonnées d'une zone."""
        try:
            return self._rest_delete("dns_zones", {"name": f"eq.{name}"})
        except Exception as e:
            raise SupabaseError(f"Failed to delete zone '{name}': {e}")

    # ============================================
    # AUDIT LOGS (httpx)
    # ============================================
    def log_action(
        self,
        actor: str,
        action: str,
        details: str | None = None,
    ) -> None:
        """Enregistre une action dans l'audit log Supabase."""
        try:
            self._rest_post("audit_logs", {
                "actor": actor,
                "action": action,
                "details": details,
            })
        except Exception as e:
            print(f"WARNING: Failed to log action: {e}")

    # ============================================
    # RECORDS (httpx)
    # ============================================
    def list_records(self, zone_name: str) -> list[dict[str, Any]]:
        """Liste les métadonnées des records d'une zone."""
        try:
            return self._rest_get(
                "dns_records",
                {"zone_name": f"eq.{zone_name}"},
            )
        except Exception as e:
            raise SupabaseError(f"Failed to list records: {e}")

    def create_record(
        self,
        zone_name: str,
        name: str,
        rtype: str,
        value: str,
        ttl: int = 3600,
        priority: int | None = None,
        created_by: str | None = None,
    ) -> dict[str, Any]:
        """Crée les métadonnées d'un record."""
        try:
            return self._rest_post("dns_records", {
                "zone_name": zone_name,
                "name": name,
                "type": rtype,
                "value": value,
                "ttl": ttl,
                "priority": priority,
                "created_by": created_by,
            })
        except Exception as e:
            raise SupabaseError(f"Failed to create record: {e}")

    def delete_record(
        self,
        zone_name: str,
        name: str,
        rtype: str,
        value: str,
    ) -> bool:
        """Supprime les métadonnées d'un record."""
        try:
            return self._rest_delete("dns_records", {
                "zone_name": f"eq.{zone_name}",
                "name": f"eq.{name}",
                "type": f"eq.{rtype}",
                "value": f"eq.{value}",
            })
        except Exception as e:
            raise SupabaseError(f"Failed to delete record: {e}")

    # ============================================
    # USERS (httpx)
    # ============================================
    def list_users(self) -> list[dict[str, Any]]:
        """Liste les profils utilisateurs."""
        try:
            return self._rest_get("user_profiles")
        except Exception as e:
            raise SupabaseError(f"Failed to list users: {e}")

    def get_user(self, user_id: str) -> dict[str, Any] | None:
        """Récupère un profil utilisateur."""
        try:
            data = self._rest_get(
                "user_profiles",
                {"id": f"eq.{user_id}", "limit": 1},
            )
            return data[0] if data else None
        except Exception as e:
            raise SupabaseError(f"Failed to get user '{user_id}': {e}")


# ============================================
# Lazy loading de l'instance globale
# ============================================
_supabase_client: SupabaseClient | None = None


def get_supabase_client() -> SupabaseClient:
    """Retourne l'instance globale (lazy loading)."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = SupabaseClient()
    return _supabase_client