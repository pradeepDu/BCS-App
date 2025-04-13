from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Form
from fastapi.responses import FileResponse
from typing import Optional
import os
import uuid
import asyncio
from pathlib import Path
import shutil
import logging
from app.services.ffmpeg_service import add_watermark, validate_format
from app.config import UPLOAD_DIR, SUPPORTED_FORMATS

router = APIRouter()

# Create uploads directory if it doesn't exist
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BACKEND_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True, parents=True)

logger = logging.getLogger(__name__)

# Log the upload directory path
logger.info(f"Upload directory: {UPLOAD_DIR}")

# Dictionary to store chunk information
chunk_storage = {}

@router.post("/add-watermark/chunk")
async def upload_watermark_chunk(
    chunk: UploadFile = File(...),
    total_chunks: int = Form(...),
    current_chunk: int = Form(...),
    upload_id: str = Form(None)
):
    try:
        # Create a unique identifier for this upload if not provided
        if not upload_id:
            upload_id = f"watermark_{uuid.uuid4()}"
        
        # Initialize storage for this upload if not exists
        if upload_id not in chunk_storage:
            chunk_storage[upload_id] = {
                "total_chunks": total_chunks,
                "received_chunks": 0,
                "chunks": {}
            }
        
        # Store the chunk
        chunk_data = await chunk.read()
        chunk_storage[upload_id]["chunks"][current_chunk] = chunk_data
        chunk_storage[upload_id]["received_chunks"] += 1
        
        # Check if all chunks are received
        if chunk_storage[upload_id]["received_chunks"] == total_chunks:
            # Create a temporary directory for this upload
            temp_dir = UPLOAD_DIR / upload_id
            temp_dir.mkdir(exist_ok=True, parents=True)
            
            # Combine chunks
            combined_data = b""
            for i in range(total_chunks):
                combined_data += chunk_storage[upload_id]["chunks"][i]
            
            # Save the complete file
            file_path = temp_dir / f"{upload_id}.mp4"
            with open(file_path, "wb") as f:
                f.write(combined_data)
            
            # Clean up chunk storage
            del chunk_storage[upload_id]
            
            logger.info(f"Successfully saved file: {file_path}")
            return {"status": "complete", "file_id": upload_id}
        
        return {"status": "chunk_received", "current_chunk": current_chunk, "upload_id": upload_id}
    except Exception as e:
        logger.error(f"Error in watermark chunk upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcode/chunk")
async def upload_transcode_chunk(
    chunk: UploadFile = File(...),
    total_chunks: int = Form(...),
    current_chunk: int = Form(...),
    upload_id: str = Form(None)
):
    try:
        # Create a unique identifier for this upload if not provided
        if not upload_id:
            upload_id = f"transcode_{uuid.uuid4()}"
        
        # Initialize storage for this upload if not exists
        if upload_id not in chunk_storage:
            chunk_storage[upload_id] = {
                "total_chunks": total_chunks,
                "received_chunks": 0,
                "chunks": {}
            }
        
        # Store the chunk
        chunk_data = await chunk.read()
        chunk_storage[upload_id]["chunks"][current_chunk] = chunk_data
        chunk_storage[upload_id]["received_chunks"] += 1
        
        # Check if all chunks are received
        if chunk_storage[upload_id]["received_chunks"] == total_chunks:
            # Create a temporary directory for this upload
            temp_dir = UPLOAD_DIR / upload_id
            temp_dir.mkdir(exist_ok=True, parents=True)
            
            # Combine chunks
            combined_data = b""
            for i in range(total_chunks):
                combined_data += chunk_storage[upload_id]["chunks"][i]
            
            # Save the complete file
            file_path = temp_dir / f"{upload_id}.mp4"
            with open(file_path, "wb") as f:
                f.write(combined_data)
            
            # Clean up chunk storage
            del chunk_storage[upload_id]
            
            logger.info(f"Successfully saved file: {file_path}")
            return {"status": "complete", "file_id": upload_id}
        
        return {"status": "chunk_received", "current_chunk": current_chunk, "upload_id": upload_id}
    except Exception as e:
        logger.error(f"Error in transcode chunk upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/add-watermark/process")
async def process_watermark(
    file_name: str = Form(...),
    output_format: str = Form("mp4"),
    watermark_image: UploadFile = File(...),
    watermark_position: str = Form("top-right")
):
    try:
        # Validate output format
        if not validate_format(output_format):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported output format. Supported formats: {', '.join(SUPPORTED_FORMATS)}"
            )

        # Get the uploaded file path
        input_video = UPLOAD_DIR / file_name / f"{file_name}.mp4"
        logger.info(f"Processing watermark for file: {input_video}")
        
        if not input_video.exists():
            logger.error(f"File not found: {input_video}")
            raise HTTPException(status_code=404, detail=f"File not found: {input_video}")

        # Save watermark image
        watermark_path = UPLOAD_DIR / file_name / "watermark.png"
        with open(watermark_path, "wb") as f:
            content = await watermark_image.read()
            f.write(content)

        # Create output path
        output_video = UPLOAD_DIR / file_name / f"watermarked_{file_name}.{output_format}"
        
        # Apply watermark with position
        success = add_watermark(
            str(input_video), 
            str(watermark_path), 
            str(output_video), 
            output_format,
            watermark_position
        )
        if not success:
            raise HTTPException(status_code=500, detail="Failed to apply watermark")

        # Return the watermarked file
        response = FileResponse(
            path=str(output_video),
            filename=f"watermarked_{file_name}.{output_format}",
            media_type=f"video/{output_format}"
        )

        # Add cleanup callback
        async def cleanup():
            try:
                temp_dir = UPLOAD_DIR / file_name
                if temp_dir.exists():
                    shutil.rmtree(temp_dir)
                    logger.info(f"Cleaned up directory: {temp_dir}")
            except Exception as e:
                logger.error(f"Error cleaning up directory: {e}")

        response.background = BackgroundTasks()
        response.background.add_task(cleanup)

        return response
    except Exception as e:
        logger.error(f"Error processing watermark: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcode/process")
async def process_transcode(
    file_name: str = Form(...),
    output_format: str = Form("mp4")
):
    try:
        # Get the uploaded file path
        file_path = UPLOAD_DIR / file_name / f"{file_name}.mp4"
        logger.info(f"Processing transcode for file: {file_path}")
        
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
        
        # Process the file (implement your transcoding logic here)
        # For now, just return the file
        response = FileResponse(
            path=str(file_path),
            filename=f"transcoded.{output_format}",
            media_type=f"video/{output_format}",
            background=None  # This ensures the file is sent before cleanup
        )
        
        # Add cleanup callback
        async def cleanup():
            try:
                temp_dir = UPLOAD_DIR / file_name
                if temp_dir.exists():
                    shutil.rmtree(temp_dir)
                    logger.info(f"Cleaned up directory: {temp_dir}")
            except Exception as e:
                logger.error(f"Error cleaning up directory: {e}")
        
        response.background = BackgroundTasks()
        response.background.add_task(cleanup)
        
        return response
    except Exception as e:
        logger.error(f"Error processing transcode: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 