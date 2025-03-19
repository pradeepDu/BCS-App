from fastapi import APIRouter, File, UploadFile, HTTPException, Form, BackgroundTasks
from fastapi.responses import FileResponse
from pathlib import Path
import os

from app.services.ffmpeg_service import transcode_video, validate_format
from app.services.file_service import save_upload_file, cleanup_files
from app.utils.logging_utils import setup_logging
from app.config import UPLOAD_DIR, SUPPORTED_FORMATS

router = APIRouter()
logger = setup_logging(__name__)

@router.post("/transcode/")
async def transcode_endpoint(
    background_tasks: BackgroundTasks,
    input_file: UploadFile = File(...),
    output_format: str = Form("mp4")
):
    """
    Transcodes an uploaded video file to the specified format.
    """
    logger.info(f"Received file: {input_file.filename}, format: {output_format}")
    
    # Validate output format
    if not validate_format(output_format):
        logger.warning(f"Unsupported output format requested: {output_format}")
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported output format. Supported formats: {', '.join(SUPPORTED_FORMATS)}"
        )
    
    input_path = None
    output_path = None
    
    try:
        # Save the uploaded file
        input_path = save_upload_file(input_file, UPLOAD_DIR, prefix="input")
        
        # Create output path
        output_filename = f"transcoded_{Path(input_path).stem}.{output_format}"
        output_path = os.path.join(UPLOAD_DIR, output_filename)

        # Transcode the video
        success = transcode_video(input_path, output_path, output_format)
        if not success:
            raise HTTPException(status_code=500, detail="Transcoding failed. Check server logs for details.")

        logger.info(f"Transcoding completed. Output file: {output_path}, size: {os.path.getsize(output_path)} bytes")

        # Schedule cleanup tasks
        background_tasks.add_task(cleanup_files, [input_path])
        background_tasks.add_task(cleanup_files, [output_path])
        
        # Return the transcoded file
        return FileResponse(
            path=output_path,
            media_type=f"video/{output_format}",
            filename=f"transcoded_{Path(input_file.filename).stem}.{output_format}"
        )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error in transcode endpoint: {str(e)}")
        # Cleanup input file if it exists
        if input_path and os.path.exists(input_path):
            cleanup_files([input_path])
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")