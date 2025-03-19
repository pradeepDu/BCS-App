from fastapi import APIRouter, File, UploadFile, HTTPException, Form, BackgroundTasks
from fastapi.responses import FileResponse
from pathlib import Path
import os

from app.services.ffmpeg_service import add_watermark, validate_format
from app.services.file_service import save_upload_file, cleanup_files
from app.utils.logging_utils import setup_logging
from app.config import UPLOAD_DIR, SUPPORTED_FORMATS

router = APIRouter()
logger = setup_logging(__name__)

@router.post("/add-watermark/")
async def add_watermark_endpoint(
    background_tasks: BackgroundTasks,
    input_video: UploadFile = File(...),
    watermark_image: UploadFile = File(...),
    output_format: str = Form("mp4")
):
    """
    Adds a watermark to an uploaded video file.
    """
    # Validate output format first
    if not validate_format(output_format):
        logger.warning(f"Unsupported output format requested: {output_format}")
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported output format. Supported formats: {', '.join(SUPPORTED_FORMATS)}"
        )
    
    video_path = None
    watermark_path = None
    output_path = None
    
    try:
        # Save the uploaded files
        video_path = save_upload_file(input_video, UPLOAD_DIR, prefix="video")
        watermark_path = save_upload_file(watermark_image, UPLOAD_DIR, prefix="watermark")
        
        # Create output path
        output_filename = f"watermarked_{Path(video_path).stem}.{output_format}"
        output_path = os.path.join(UPLOAD_DIR, output_filename)
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Add watermark to the video
        success = add_watermark(video_path, watermark_path, output_path, output_format)
        if not success:
            raise HTTPException(status_code=500, detail="Adding watermark failed. Check server logs for details.")

        # Verify the output file exists
        if not os.path.exists(output_path):
            raise HTTPException(status_code=500, detail="Output file not created. Check server logs for details.")

        logger.info(f"Watermarking completed. Output file: {output_path}, size: {os.path.getsize(output_path)} bytes")

        # Schedule cleanup for temporary files
        background_tasks.add_task(cleanup_files, [video_path, watermark_path])
        
        # Schedule cleanup for output file (after it's been sent to client)
        background_tasks.add_task(cleanup_files, [output_path], delay=60)  # 60 second delay
        
        # Return the watermarked file
        return FileResponse(
            path=output_path,
            media_type=f"video/{output_format}",
            filename=f"watermarked_{Path(input_video.filename).stem}.{output_format}"
        )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error in watermark endpoint: {str(e)}")
        # Cleanup files if they exist
        files_to_cleanup = [f for f in [video_path, watermark_path, output_path] if f and os.path.exists(f)]
        if files_to_cleanup:
            cleanup_files(files_to_cleanup)
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")