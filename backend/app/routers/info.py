from fastapi import APIRouter
from app.services.ffmpeg_service import get_ffmpeg_info
from app.config import SUPPORTED_FORMATS

router = APIRouter()

@router.get("/health")
async def health_check():
    """
    Health check endpoint to verify the API is running.
    """
    return {"status": "healthy", "version": "1.0.0"}

@router.get("/ffmpeg-info")
async def ffmpeg_info():
    """
    Returns information about the FFmpeg installation and available codecs.
    """
    info = get_ffmpeg_info()
    info["supported_formats"] = SUPPORTED_FORMATS
    return info