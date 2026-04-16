"""Build backend into a standalone directory using PyInstaller."""

import PyInstaller.__main__
import shutil
from pathlib import Path


def build():
    dist_path = Path("dist")
    if dist_path.exists():
        shutil.rmtree(dist_path)

    print("Building backend with PyInstaller...")

    PyInstaller.__main__.run([
        "main.py",
        "--name=backend",
        "--onedir",
        "--console",
        "--clean",
        "--noconfirm",
        # ── FastAPI + Uvicorn ──
        "--hidden-import=fastapi",
        "--hidden-import=uvicorn",
        "--hidden-import=uvicorn.logging",
        "--hidden-import=uvicorn.loops",
        "--hidden-import=uvicorn.loops.auto",
        "--hidden-import=uvicorn.protocols",
        "--hidden-import=uvicorn.protocols.http",
        "--hidden-import=uvicorn.protocols.http.auto",
        "--hidden-import=uvicorn.protocols.websockets",
        "--hidden-import=uvicorn.protocols.websockets.auto",
        "--hidden-import=uvicorn.lifespan",
        "--hidden-import=uvicorn.lifespan.on",
        "--hidden-import=uvicorn.lifespan.off",
        # ── Multipart / Pydantic ──
        "--hidden-import=multipart",
        "--hidden-import=python_multipart",
        "--hidden-import=pydantic",
        "--hidden-import=pydantic_core",
        # ── OCR ──
        "--hidden-import=rapidocr",
        "--hidden-import=cv2",
        "--hidden-import=numpy",
        "--hidden-import=PIL",
        # ── Reports / exports ──
        "--hidden-import=openpyxl",
        "--hidden-import=reportlab",
        "--hidden-import=reportlab.lib",
        "--hidden-import=reportlab.platypus",
        "--hidden-import=rapidfuzz",
        # ── Exclude packages installed globally but NOT needed ──
        "--exclude-module=torch",
        "--exclude-module=torchvision",
        "--exclude-module=torchaudio",
        "--exclude-module=pygame",
        "--exclude-module=pandas",
        "--exclude-module=pyarrow",
        "--exclude-module=scipy",
        "--exclude-module=numba",
        "--exclude-module=llvmlite",
        # shapely is required by rapidocr for text detection
        "--exclude-module=psycopg",
        "--exclude-module=psycopg_binary",
        "--exclude-module=psycopg2",
        "--exclude-module=matplotlib",
        "--exclude-module=IPython",
        "--exclude-module=jupyter",
        "--exclude-module=notebook",
        "--exclude-module=imageio_ffmpeg",
        "--exclude-module=tkinter",
        "--exclude-module=test",
        "--exclude-module=unittest",
        # ── Runtime hook to fix onnxruntime DLL loading ──
        "--runtime-hook=pyinstaller_hooks/rthook_onnxruntime.py",
        # ── Collect OCR model data files ──
        "--collect-all=rapidocr",
        # ── Include our source modules ──
        "--add-data=config.py:.",
        "--add-data=database:database",
        "--add-data=models:models",
        "--add-data=routes:routes",
        "--add-data=services:services",
    ])

    print(f"Backend built successfully at {dist_path / 'backend'}!")


if __name__ == "__main__":
    build()
