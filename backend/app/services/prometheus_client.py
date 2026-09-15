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

    def query_first_value(self, expressions: list[str]) -> float | None:
        """
        Retourne la première valeur trouvée parmi les expressions.
        Retourne None si aucune expression ne renvoie de résultat.
        N'INVENTE JAMAIS de valeur.
        """
        for expression in expressions:
            try:
                result = self.query(expression)
                samples = result.get("data", {}).get("result", [])
                if not samples:
                    continue
                raw_value = samples[0].get("value", [None, None])[1]
                if raw_value is None:
                    continue
                parsed = float(raw_value)
                if parsed == parsed:  # filtre NaN
                    return parsed
            except Exception:
                continue
        return None

    def query_vector(self, expressions: list[str]) -> list[dict]:
        """
        Retourne le premier vecteur non vide trouvé parmi les expressions.
        Retourne [] si aucune expression ne renvoie de résultat.
        """
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
        """
        Retourne les statistiques DNS.
        Chaque valeur peut être None si Prometheus ne répond pas.
        Le flag 'available' indique si au moins une métrique a été récupérée.
        """
        request_rate = self.query_first_value([
            'sum(rate(bind_dns_queries_total[5m]))',
            'sum(rate(named_queries_total[5m]))',
            'sum(rate(named_resolver_requests_total[5m]))',
        ])
        cache_hit_rate = self.query_first_value([
            '100 * sum(rate(bind_dns_cache_hits_total[5m])) / clamp_min(sum(rate(bind_dns_cache_hits_total[5m])) + sum(rate(bind_dns_cache_misses_total[5m])), 1)',
        ])
        latency_ms = self.query_first_value([
            '1000 * avg(bind_dns_query_duration_seconds)',
            '1000 * avg(named_resolver_query_duration_seconds)',
        ])
        error_rate = self.query_first_value([
            '100 * sum(rate(bind_dns_servfail_total[5m])) / clamp_min(sum(rate(bind_dns_queries_total[5m])), 1)',
        ])

        available = any(
            v is not None
            for v in [request_rate, cache_hit_rate, latency_ms, error_rate]
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
        """
        Retourne l'état des services supervisés.
        'available' = True si Prometheus a renvoyé au moins une métrique.
        """
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
        Retourne les domaines les plus demandés.
        Retourne [] si Prometheus ne répond pas.
        N'INVENTE JAMAIS de domaine.
        """
        samples = self.query_vector([
            f'topk({limit}, sum by (domain) (rate(bind_dns_queries_total[5m])))',
            f'topk({limit}, sum by (name) (rate(named_queries_total[5m])))',
            f'topk({limit}, sum by (qname) (rate(named_resolver_requests_total[5m])))',
        ])

        domains: list[dict] = []
        for sample in samples:
            metric = sample.get('metric', {})
            domain = (
                metric.get('domain')
                or metric.get('name')
                or metric.get('qname')
                or 'unknown'
            )
            raw_value = sample.get('value', [None, '0'])[1]
            try:
                hits = float(raw_value)
            except Exception:
                hits = 0.0
            domains.append({'domain': domain, 'hits': int(hits)})

        return domains[:limit]

    def query_alerts(self) -> list[dict]:
        """
        Retourne les alertes basées sur l'état de santé et les stats.
        Si Prometheus ne répond pas, retourne une alerte explicite.
        """
        health = self.query_health()
        stats = self.query_stats()
        alerts: list[dict] = []

        if not health.get('available', False) and not stats.get('available', False):
            return [{
                'severity': 'warning',
                'title': 'Prometheus indisponible',
                'detail': 'Impossible de récupérer les métriques. Vérifier le service Prometheus.',
            }]

        # Alertes sur l'état des services
        if health.get('primary') == 'down':
            alerts.append({
                'severity': 'critique',
                'title': 'BIND9 primary indisponible',
                'detail': 'Le job Prometheus bind9 ne répond pas ou le service est à l’arrêt.',
            })
        if health.get('secondary') == 'down':
            alerts.append({
                'severity': 'warning',
                'title': 'BIND9 secondary indisponible',
                'detail': 'Le job Prometheus bind9-secondary ne répond pas.',
            })
        if health.get('wazuh') == 'down':
            alerts.append({
                'severity': 'warning',
                'title': 'Wazuh indisponible',
                'detail': 'Le scrape Wazuh n’est pas joignable depuis Prometheus.',
            })

        latency = stats.get('latency_ms')
        if latency is not None and latency > 50:
            alerts.append({
                'severity': 'warning',
                'title': 'Latence DNS élevée',
                'detail': f"Latence moyenne observée: {latency:.1f} ms",
            })

        error_rate = stats.get('error_rate')
        if error_rate is not None and error_rate > 2:
            alerts.append({
                'severity': 'critique',
                'title': 'Taux d’erreur DNS élevé',
                'detail': f"Taux d’erreur observé: {error_rate:.1f}%",
            })

        if not alerts:
            alerts.append({
                'severity': 'info',
                'title': 'Supervision nominale',
                'detail': 'Tous les services supervisés répondent correctement.',
            })

        return alerts