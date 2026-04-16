"""Receipt Processor Pro — FastAPI backend entry point."""

import os
import sys
from pathlib import Path

# Fix onnxruntime DLL loading in PyInstaller bundles.
# The pyd needs onnxruntime.dll from the capi dir, but PyInstaller doesn't
# add subpackage dirs to the DLL search path automatically.
if sys.platform == "win32" and getattr(sys, "frozen", False):
    _meipass = getattr(sys, "_MEIPASS", None)
    if _meipass:
        _ort_capi = os.path.join(_meipass, "onnxruntime", "capi")
        if os.path.isdir(_ort_capi):
            os.add_dll_directory(_ort_capi)
            # Also add to PATH as fallback for older DLL resolution
            os.environ["PATH"] = _ort_capi + os.pathsep + os.environ.get("PATH", "")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend package is on path for PyInstaller compatibility
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import HOST, PORT, DATA_DIR
from database.init_db import init_db
from routes.batches import router as batches_router
from routes.receipts import router as receipts_router
from routes.vendors import router as vendors_router
from routes.reports import router as reports_router
from routes.exports import router as exports_router
from routes.staging import router as staging_router
from routes.ocr import router as ocr_router


# Track startup readiness
_db_ready = False


app = FastAPI(
    title="Receipt Processor Pro",
    version="2.1.0",
    description="Offline Financial Data & Reporting Engine",
)


@app.on_event("startup")
def startup():
    """Initialize database on app startup."""
    global _db_ready
    init_db()
    _db_ready = True

# CORS — allow localhost origins for Tauri frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:*", "http://127.0.0.1:*", "tauri://localhost", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(batches_router)
app.include_router(receipts_router)
app.include_router(vendors_router)
app.include_router(reports_router)
app.include_router(exports_router)
app.include_router(staging_router)
app.include_router(ocr_router)

# Serve uploaded receipt images as static files
# Only mount if DATA_DIR exists (it should, config.py creates it)
try:
    from fastapi.staticfiles import StaticFiles
    app.mount("/data", StaticFiles(directory=str(DATA_DIR)), name="data")
except Exception:
    pass


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "2.1.0", "db_ready": _db_ready}


if __name__ == "__main__":
    import sys
    import uvicorn
    if getattr(sys, "frozen", False):
        # Packaged exe — run app object directly (no reload, no import string)
        uvicorn.run(app, host=HOST, port=PORT)
    else:
        # Dev mode — use string import for hot reload
        uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
