"""Application configuration — paths, constants, defaults."""

import os
import sys
from pathlib import Path

BASE_DIR = Path(sys.executable if getattr(sys, "frozen", False) else __file__).resolve().parent

# ── Portable data folder logic ──
# Priority: RPP_DATA_DIR env var > "ReceiptProcessorData" next to the exe > project root /data
if os.environ.get("RPP_DATA_DIR"):
    DATA_DIR = Path(os.environ["RPP_DATA_DIR"])
elif getattr(sys, "frozen", False):
    # Running as PyInstaller bundle — keep app data next to the executable.
    DATA_DIR = BASE_DIR / "ReceiptProcessorData"
else:
    # Dev mode — use project root/data
    DATA_DIR = Path(__file__).resolve().parent.parent / "data"

DATA_DIR.mkdir(parents=True, exist_ok=True)

EXPORTS_DIR = DATA_DIR / "exports"
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

IMAGES_DIR = DATA_DIR / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = BASE_DIR / "receipts.db" if getattr(sys, "frozen", False) else DATA_DIR / "receipts.db"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp"}

# Server
HOST = "127.0.0.1"
PORT = int(os.environ.get("RPP_PORT", 8741))

# Vendor normalization
FUZZY_THRESHOLD = 85  # percent similarity to consider same vendor
