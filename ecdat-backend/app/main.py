from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import workspaces, jobs, sources, cbom
from app.routers.risk import workspace_router as risk_workspace_router, asset_router as risk_asset_router

app = FastAPI(title="ECDAT Backend API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workspaces.router)
app.include_router(jobs.router)
app.include_router(sources.router)
app.include_router(cbom.router)

# Phase 4: Risk engine routers
# Workspace-scoped:  GET /workspaces/{id}/risk  |  GET /workspaces/{id}/risk/summary
# Asset-scoped:      GET /assets/{id}/risk       |  POST /assets/{id}/risk/recalculate
app.include_router(risk_workspace_router)
app.include_router(risk_asset_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
