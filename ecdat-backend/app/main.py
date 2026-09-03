from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import workspaces, jobs, sources, cbom
from app.routers.risk import workspace_router as risk_workspace_router, asset_router as risk_asset_router

app = FastAPI(title="ECDAT Backend API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workspaces.router)
app.include_router(jobs.router)
app.include_router(sources.router)

# CBOM router (support both /workspaces/... and /api/workspaces/...)
app.include_router(cbom.router)
app.include_router(cbom.router, prefix="/api")

# Phase 4: Risk engine routers (support both root and /api prefixes)
# Workspace-scoped:  GET /api/workspaces/{id}/risk  |  GET /api/workspaces/{id}/risk/summary
# Asset-scoped:      GET /api/assets/{id}/risk       |  POST /api/assets/{id}/risk/recalculate
app.include_router(risk_workspace_router)
app.include_router(risk_asset_router)
app.include_router(risk_workspace_router, prefix="/api")
app.include_router(risk_asset_router, prefix="/api")

# Phase 5: Recommendation engine routers (support both root and /api prefixes)
# Workspace-scoped:  GET /api/workspaces/{id}/recommendations
# Asset-scoped:      GET /api/assets/{id}/recommendation
from app.routers.recommendations import (
    workspace_router as rec_workspace_router,
    asset_router as rec_asset_router,
)
app.include_router(rec_workspace_router)
app.include_router(rec_asset_router)
app.include_router(rec_workspace_router, prefix="/api")
app.include_router(rec_asset_router, prefix="/api")

# Phase 6: Assets router (support both root and /api prefixes)
# Workspace-scoped:  GET /api/workspaces/{id}/assets
# Asset-scoped:      GET /api/assets/{id}  |  GET /api/assets/{id}/evidence
from app.routers.assets import (
    workspace_router as asset_ws_router,
    asset_router as asset_single_router,
)
app.include_router(asset_ws_router)
app.include_router(asset_single_router)
app.include_router(asset_ws_router, prefix="/api")
app.include_router(asset_single_router, prefix="/api")

# Phase 8: AI Analyst router (support both root and /api prefixes)
# GET  /api/workspaces/{id}/analyst/status
# POST /api/workspaces/{id}/analyst/query
from app.routers.analyst import router as analyst_router
app.include_router(analyst_router)
app.include_router(analyst_router, prefix="/api")

# Phase 10: Audit/Activity router (support both root and /api prefixes)
# GET /api/workspaces/{id}/activity
from app.routers.audit import router as audit_router
app.include_router(audit_router)
app.include_router(audit_router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
