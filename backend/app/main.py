from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import zones, auth, records, monitoring, diagnostics, security, audit, users, falco

app = FastAPI(title="Dynamix DNS Manager API")

# UN SEUL middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://dns.local",
        "http://dns.local",
        "https://api.dns.local",
        "http://api.dns.local",
        "http://localhost:8080",
        "http://localhost:5173", 
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(zones.router, prefix="/api/zones", tags=["zones"])
app.include_router(records.router, prefix="/api/zones", tags=["records"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["monitoring"])
app.include_router(security.router, prefix="/api/security", tags=["security"])
app.include_router(diagnostics.router, prefix="/api/diagnostics", tags=["diagnostics"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(falco.router, prefix="/api/security/falco", tags=["falco"])

@app.get("/health")
async def health():
    return {"status": "ok"}