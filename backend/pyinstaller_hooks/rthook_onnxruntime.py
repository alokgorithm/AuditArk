"""PyInstaller runtime hook: pre-load onnxruntime DLLs before import."""
import os
import sys

if sys.platform == "win32" and getattr(sys, "frozen", False):
    base = getattr(sys, "_MEIPASS", None)
    if base:
        ort_capi = os.path.join(base, "onnxruntime", "capi")
        if os.path.isdir(ort_capi):
            os.add_dll_directory(ort_capi)
            os.environ["PATH"] = ort_capi + os.pathsep + os.environ.get("PATH", "")
            # Pre-load the DLLs in the correct order using ctypes
            import ctypes
            for dll_name in ["onnxruntime_providers_shared.dll", "onnxruntime.dll"]:
                dll_path = os.path.join(ort_capi, dll_name)
                if os.path.isfile(dll_path):
                    try:
                        ctypes.CDLL(dll_path)
                    except OSError:
                        pass
