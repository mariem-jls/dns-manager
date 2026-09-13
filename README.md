Dynamix DNS Manager

This repository contains the DNS management stack and a new full-stack application to manage BIND9.

Quick start (development):

1. Ensure existing services (bind, prometheus, grafana) are running via docker-compose.
2. Start the app stack for development:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Backend API: http://localhost:8000
Frontend: http://localhost:5173

See `backend/.env.example` and `frontend` package.json for details.
