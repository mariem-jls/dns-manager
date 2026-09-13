from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import zones, auth, records, monitoring, diagnostics, security, audit

app = FastAPI(title="Dynamix DNS Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(zones.router, prefix="/api/zones", tags=["zones"])
app.include_router(records.router, prefix="/api/zones", tags=["records"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["monitoring"])
app.include_router(security.router, prefix="/api/security", tags=["security"])
app.include_router(diagnostics.router, prefix="/api/diagnostics", tags=["diagnostics"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])

@app.get("/health")
async def health():
    return {"status": "ok"}
