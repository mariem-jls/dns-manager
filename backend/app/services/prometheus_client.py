import httpx

from app.config import settings


class PrometheusClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = base_url or settings.prometheus_url

    def query(self, expr: str):
        url = f"{self.base_url}/api/v1/query"
        response = httpx.get(url, params={"query": expr}, timeout=10.0)
        response.raise_for_status()
        return response.json()

    def query_range(self, expr: str, start: int, end: int, step: int = 60):
        """Récupère une série temporelle."""
        url = f"{self.base_url}/api/v1/query_range"
        response = httpx.get(
            url,
            params={"query": expr, "start": start, "end": end, "step": step},
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json().get("data", {}).get("result", [])

    def query_first_value(self, expressions: list[str]) -> float | None:
        """Retourne la première valeur trouvée. None si aucune."""
        for expression in expressions:
            try:
                result = self.query(expression)
                samples = result.get("data", {}).get("result", [])
                if not samples:
                    continue
                raw_value = samples[0].get("value", [None, None])[1]
                if raw_value is None or raw_value == "NaN":
                    continue
                parsed = float(raw_value)
                if parsed == parsed:  # filtre NaN
                    return parsed
            except Exception:
                continue
        return None

    def query_vector(self, expressions: list[str]) -> list[dict]:
        """Retourne le premier vecteur non vide."""
        for expression in expressions:
            try:
                result = self.query(expression)
                samples = result.get("data", {}).get("result", [])
                if samples:
                    return samples
            except Exception:
                continue
        return []

    def query_stats(self) -> dict:
        """Statistiques DNS."""
        # 1. Requêtes par seconde
        request_rate = self.query_first_value([
            'sum(rate(bind_incoming_queries_total[5m]))',
            'sum(rate(bind_resolver_queries_total[5m]))',
            'sum(rate(bind_incoming_requests_total[5m]))',
        ])

        # 2. Latence : bind_exporter n'expose pas de vraie latence (NaN)
        # On essaie l'histogramme, sinon None
        latency_ms = self.query_first_value([
            '1000 * histogram_quantile(0.95, sum by (le) (rate(bind_resolver_query_duration_seconds_bucket[5m])))',
        ])

        # 3. Taux d'erreur (%)
        error_rate = self.query_first_value([
            '100 * (sum(rate(bind_response_rcodes_total{rcode="SERVFAIL"}[5m])) / clamp_min(sum(rate(bind_responses_total[5m])), 1))',
        ])

        # 4. Cache hit rate : non exposé par bind_exporter
        cache_hit_rate = None

        available = any(
            v is not None
            for v in [request_rate, latency_ms, error_rate]
        )

        return {
            'available': available,
            'source': 'prometheus' if available else 'unavailable',
            'request_rate': request_rate,
            'cache_hit_rate': cache_hit_rate,
            'latency_ms': latency_ms,
            'error_rate': error_rate,
        }

    def query_health(self) -> dict:
        metrics = self.query_vector([
            'up{job="bind9"}',
            'up{job="wazuh"}',
            'up{job="prometheus"}',
        ])

        health = {
            'available': len(metrics) > 0,
            'primary': 'unknown',
            'secondary': 'unknown',
            'prometheus': 'unknown',
            'wazuh': 'unknown',
        }

        for sample in metrics:
            metric = sample.get('metric', {})
            job = metric.get('job')
            raw_value = sample.get('value', [None, '0'])[1]
            try:
                value = float(raw_value)
            except Exception:
                continue
            status = 'up' if value >= 1 else 'down'

            if job == 'bind9':
                health['primary'] = status
                health['secondary'] = status
            elif job == 'wazuh':
                health['wazuh'] = status
            elif job == 'prometheus':
                health['prometheus'] = status

        return health

    def query_top_domains(self, limit: int = 10) -> list[dict]:
        """
        Top domaines.
        bind_exporter n'expose PAS les stats par domaine.
        On retourne une liste vide (N/A).
        """
        return []

    def query_alerts(self) -> list[dict]:
        health = self.query_health()
        stats = self.query_stats()
        alerts: list[dict] = []

        if not health.get('available', False) and not stats.get('available', False):
            return [{
                'severity': 'warning',
                'title': 'Prometheus indisponible',
                'detail': 'Impossible de récupérer les métriques.',
            }]

        if health.get('primary') == 'down':
            alerts.append({
                'severity': 'critique',
                'title': 'BIND9 primary indisponible',
                'detail': 'Le job bind9 ne répond pas.',
            })
        if health.get('secondary') == 'down':
            alerts.append({
                'severity': 'warning',
                'title': 'BIND9 secondary indisponible',
                'detail': 'Le job bind9-secondary ne répond pas.',
            })
        if health.get('wazuh') == 'down':
            alerts.append({
                'severity': 'info',
                'title': 'Wazuh désactivé',
                'detail': 'Wazuh est désactivé temporairement (profil docker).',
            })

        error_rate = stats.get('error_rate')
        if error_rate is not None and error_rate > 2:
            alerts.append({
                'severity': 'critique',
                'title': 'Taux d\'erreur DNS élevé',
                'detail': f"Taux observé: {error_rate:.2f}%",
            })

        if not alerts:
            alerts.append({
                'severity': 'info',
                'title': 'Supervision nominale',
                'detail': 'Tous les services supervisés répondent correctement.',
            })

        return alerts

    def query_series(self, duration_min: int = 30, step: int = 60) -> list[dict]:
        """
        Série temporelle de requêtes/sec sur N minutes.
        """
        import time
        now = int(time.time())
        start = now - duration_min * 60

        samples = self.query_range(
            'sum(rate(bind_incoming_queries_total[1m]))',
            start=start,
            end=now,
            step=step,
        )

        if not samples:
            return []

        values = samples[0].get("values", [])
        items = []
        for ts, v in values:
            try:
                items.append({"ts": int(ts), "value": float(v)})
            except (ValueError, TypeError):
                continue
        return items

    def query_traffic_distribution(self) -> list[dict]:
        """Répartition des requêtes par type DNS."""
        samples = self.query_vector([
            'sum by (type) (rate(bind_incoming_queries_total[5m]))',
        ])

        items = []
        for s in samples:
            metric = s.get("metric", {})
            name = metric.get("type", "unknown")
            raw_value = s.get("value", [None, "0"])[1]
            try:
                value = float(raw_value)
            except (ValueError, TypeError):
                continue
            if value > 0:
                items.append({"name": name, "value": value})
        return items