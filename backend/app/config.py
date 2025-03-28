import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Temporary directory to store uploaded files
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Logs directory
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

# MongoDB settings
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb+srv://dukemarquis2004:rBuLYvMAPm5fg35A@cluster0.tayfsea.mongodb.net/")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "bcs_platform")

# Supported formats
SUPPORTED_FORMATS = ["mp4", "webm", "avi", "mov", "flv"]

# Check if MKV support is available before adding it to supported formats
try:
    import ffmpeg
    import subprocess
    result = subprocess.run(["ffmpeg", "-formats"], capture_output=True, text=True)
    if "matroska" in result.stdout or "mkv" in result.stdout:
        SUPPORTED_FORMATS.append("mkv")
except Exception:
    # If check fails, don't add mkv to supported formats
    pass