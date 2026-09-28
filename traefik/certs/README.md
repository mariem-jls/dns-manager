# Certificats Traefik

Pour générer les certificats auto-signés :

```bash
cd traefik/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout dns.local.key \
  -out dns.local.crt \
  -subj "/C=FR/ST=IDF/L=Paris/O=Dynamix/CN=*.dns.local" \
  -addext "subjectAltName=DNS:dns.local,DNS:*.dns.local,DNS:traefik.dns.local,DNS:api.dns.local,DNS:grafana.dns.local,DNS:prometheus.dns.local"