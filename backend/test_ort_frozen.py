import os, sys

# Same DLL fix as in main.py
if sys.platform == "win32" and getattr(sys, "frozen", False):
    _meipass = getattr(sys, "_MEIPASS", "")
    if _meipass:
        ort_capi = os.path.join(_meipass, "onnxruntime", "capi")
        if os.path.isdir(ort_capi):
            os.add_dll_directory(ort_capi)
            os.environ["PATH"] = ort_capi + os.pathsep + os.environ.get("PATH", "")
            print(f"Added DLL dir: {ort_capi}")
        print(f"MEIPASS: {_meipass}")
        print(f"Files in ort_capi: {os.listdir(ort_capi)}")
        # Try loading onnxruntime.dll directly via ctypes first
        import ctypes
        try:
            lib = ctypes.CDLL(os.path.join(ort_capi, "onnxruntime.dll"))
            print(f"ctypes load onnxruntime.dll: OK")
        except Exception as e:
            print(f"ctypes load onnxruntime.dll: FAILED - {e}")

try:
    import onnxruntime
    print(f"onnxruntime imported OK, version: {onnxruntime.__version__}")
except ImportError as e:
    print(f"onnxruntime import FAILED: {e}")
    import traceback
    traceback.print_exc()
