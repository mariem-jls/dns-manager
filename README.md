# Dynamix DNS Manager

Dynamix DNS Manager est une application full-stack de gestion de zones DNS
BIND9. Elle fournit une API FastAPI, une interface React et une stack
d'observabilite et de securite composee notamment de PostgreSQL, Prometheus,
Grafana, Wazuh et Falco.

## Fonctionnalites

- Gestion des zones et des enregistrements DNS BIND9
- Authentification et gestion des utilisateurs via Supabase
- Diagnostics et supervision de l'infrastructure DNS
- Journalisation des actions d'administration
- Monitoring Prometheus/Grafana et alertes de securite Wazuh/Falco
- Interface web React servie par Nginx en production

## Architecture

| Composant | Technologie | Port local |
| --- | --- | --- |
| API | FastAPI / Uvicorn | `8000` |
| Interface web | React / Vite en developpement, Nginx en production | `5173` ou `80` |
| DNS primaire | BIND9 | `5353` |
| DNS secondaire | BIND9 | `5300` |
| Base de donnees | PostgreSQL | `5432` |
| Monitoring | Prometheus / Grafana | selon la configuration Traefik |

## Prerequis

- Docker Engine et Docker Compose v2
- Git
- Un fichier `.env` a la racine du projet
- Pour le developpement local : Python 3.11+ et Node.js 20+

## Installation rapide

Cloner le depot et creer la configuration locale :

```bash
git clone https://github.com/mariem-jls/dns-manager.git
cd dns-manager
cp .env.example .env
```

Modifier ensuite `.env`, en particulier les mots de passe, `SECRET_KEY`, les
identifiants Wazuh et les cles Supabase. Ne jamais committer ce fichier.

## Demarrage avec Docker

Pour demarrer la stack complete en mode production :

```bash
docker compose up -d --build
```

Consulter l'etat des services et les logs :

```bash
docker compose ps
docker compose logs -f backend
```

Arreter les services :

```bash
docker compose down
```

L'API est disponible sur `http://localhost:8000` lorsqu'elle est exposee,
et son endpoint de sante est `http://localhost:8000/health`.

## Developpement local

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

Dans un second terminal :

```bash
cd frontend
npm ci
npm run dev
```

L'interface est alors disponible sur `http://localhost:5173`.

## Tests et qualite

Les commandes utilisees par la CI sont reproductibles localement :

```bash
cd backend
pip install -r requirements.txt pytest ruff
ruff check app tests
pytest -q
cd ../frontend
npm ci
npx tsc --noEmit
npm run build
```

Le test backend actuel verifie l'endpoint `/health`. Les tests doivent etre
etendus au fur et a mesure des nouvelles fonctionnalites.

## CI/CD et publication GHCR

Le workflow [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) est
execute sur chaque pull request et sur chaque push vers `main`.

Il effectue successivement :

1. Lint Python avec Ruff et verification TypeScript avec `tsc`.
2. Test backend avec Pytest et build du frontend.
3. Publication des images Docker sur GitHub Container Registry, uniquement
	apres un push valide sur `main`.
4. Creation d'une release GitHub versionnee au format `v1.0.<run_number>`.

Les images sont publiees sous les noms suivants :

```text
ghcr.io/mariem-jls/dns-manager/backend:latest
ghcr.io/mariem-jls/dns-manager/frontend:latest
```

Le workflow utilise `GITHUB_TOKEN`. Le depot doit donc autoriser les actions
a ecrire dans `packages` et `contents` via les permissions du workflow.

## Dependabot

Dependabot est configure dans [`.github/dependabot.yml`](.github/dependabot.yml)
pour proposer chaque mois des mises a jour des dependances Python, npm et des
GitHub Actions.

## Structure du projet

```text
backend/       API FastAPI, services et tests
frontend/      Application React/Vite
bind9/         Configuration et zones DNS primaires
bind9-secondary/ Configuration DNS secondaire
docs/          Schemas SQL et documentation technique
grafana/       Dashboards et provisioning Grafana
prometheus/    Configuration Prometheus
wazuh/         Donnees et logs Wazuh
falco/         Regles et configuration Falco
traefik/       Reverse proxy et certificats locaux
```

## Securite

- Ne pas versionner `.env`, les cles privees ou les certificats.
- Remplacer toutes les valeurs d'exemple avant un deploiement.
- Limiter les secrets et les permissions a ce qui est necessaire.
- Verifier les permissions des volumes BIND9 avant de lancer la stack.

## Licence

Aucune licence open source n'est actuellement declaree dans ce depot.
