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
from app.models.job_history import JobHistoryCreate
from app.models.job_log import JobLogCreate
from app.services.job_history_service import add_job

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

# Helper function to add logs
async def add_log(job_id: str, action: str, details: str = None, status: str = "processing", stage: str = None, progress: int = None):
    try:
        from app.services.database import Database
        db = Database.get_job_logs_collection()
        
        # Add debugging log
        logger.info(f"Adding log for job_id: {job_id}, action: {action}, status: {status}")
        
        log = JobLogCreate(
            job_id=job_id,
            action=action,
            details=details,
            status=status,
            stage=stage,
            progress=progress
        )
        log_dict = log.model_dump()
        result = await db.insert_one(log_dict)
        
        # Log the inserted ID for troubleshooting
        logger.info(f"Added log with ID: {result.inserted_id} for job: {job_id}")
        
        return result.inserted_id
    except Exception as e:
        logger.error(f"Failed to add log: {e}")
        logger.exception("Full error details:")
        return None

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
    watermark_position: str = Form("top-right"),
    user_id: str = Form(...),
    user_name: str = Form(None),
    user_email: str = Form(None),
    job_id: str = Form(None),
    original_file_name: str = Form(None)  # Add parameter for original file name
):
    job_db_id = None
    try:
        logger.info(f"Starting watermark processing with:")
        logger.info(f"File name: {file_name}")
        logger.info(f"Original file name: {original_file_name}")
        logger.info(f"Output format: {output_format}")
        logger.info(f"Watermark position: {watermark_position}")
        logger.info(f"User ID: {user_id}")
        logger.info(f"Frontend job ID: {job_id}")
        
        # Use original file name if provided, otherwise use file_name
        display_file_name = original_file_name if original_file_name else file_name
        
        # Create initial job history entry
        job = JobHistoryCreate(
            user_id=user_id,
            user_name=user_name,
            user_email=user_email,
            file_name=display_file_name,
            file_size=0,  # Will be updated after processing
            file_type="video/mp4",
            status="processing",
            output_format=output_format,
            processing_type="watermark",
            progress=0,
            current_stage="Initializing",
            frontend_id=job_id  # Store the frontend job ID for reference
        )
        job_record = await add_job(job)
        
        # Store the job ID as a string to ensure consistency
        job_db_id = str(job_record.id)
        logger.info(f"Created job with DB ID: {job_db_id}")
        
        # Add initial log
        await add_log(
            job_id=job_db_id,
            action="Initialize processing",
            details=f"Starting watermark processing for file {display_file_name}",
            status="processing",
            stage="Initializing",
            progress=0
        )
        
        # Update progress to uploading video
        job.progress = 15
        job.current_stage = "Uploading Video"
        await add_job(job)
        
        # Add log for video upload
        await add_log(
            job_id=job_db_id,
            action="Upload video",
            details=f"Video file {display_file_name} uploaded",
            status="processing",
            stage="Uploading Video",
            progress=15
        )
        
        # Validate output format
        if not validate_format(output_format):
            logger.error(f"Unsupported output format: {output_format}")
            job.status = "error"
            job.current_stage = "Error"
            await add_job(job)
            
            # Add error log
            await add_log(
                job_id=job_db_id,
                action="Validate format",
                details=f"Unsupported output format: {output_format}",
                status="error",
                stage="Error",
                progress=0
            )
            
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported output format. Supported formats: {', '.join(SUPPORTED_FORMATS)}"
            )

        # Get the uploaded file path
        input_video = UPLOAD_DIR / display_file_name / f"{display_file_name}.mp4"
        logger.info(f"Looking for input video at: {input_video}")
        
        if not input_video.exists():
            logger.error(f"File not found: {input_video}")
            job.status = "error"
            job.current_stage = "Error"
            await add_job(job)
            
            # Add error log
            await add_log(
                job_id=job_db_id,
                action="Locate video file",
                details=f"File not found: {input_video}",
                status="error",
                stage="Error",
                progress=0
            )
            
            raise HTTPException(status_code=404, detail=f"File not found: {input_video}")

        # Update progress to uploading watermark
        job.progress = 30
        job.current_stage = "Uploading Watermark"
        await add_job(job)
        
        # Add log for watermark upload start
        await add_log(
            job_id=job_db_id,
            action="Upload watermark",
            details="Starting watermark upload",
            status="processing",
            stage="Uploading Watermark",
            progress=30
        )

        # Save watermark image
        watermark_path = UPLOAD_DIR / display_file_name / "watermark.png"
        logger.info(f"Saving watermark to: {watermark_path}")
        
        try:
            content = await watermark_image.read()
            logger.info(f"Read {len(content)} bytes from watermark file")
            
            with open(watermark_path, "wb") as f:
                f.write(content)
                logger.info(f"Successfully wrote watermark to {watermark_path}")
                
            # Verify the watermark file was saved correctly
            if not watermark_path.exists():
                raise Exception("Watermark file was not created")
                
            logger.info(f"Watermark file size: {os.path.getsize(watermark_path)} bytes")
        except Exception as e:
            logger.error(f"Error saving watermark: {str(e)}")
            job.status = "error"
            job.current_stage = "Error"
            await add_job(job)
            
            # Add error log
            await add_log(
                job_id=job_db_id,
                action="Save watermark",
                details=f"Failed to save watermark: {str(e)}",
                status="error",
                stage="Error",
                progress=0
            )
            
            raise HTTPException(status_code=500, detail=f"Failed to save watermark: {str(e)}")

        # Update progress to processing
        job.progress = 60
        job.current_stage = "Processing"
        await add_job(job)
        
        # Add log for processing start
        await add_log(
            job_id=job_db_id,
            action="Processing",
            details="Starting video processing with watermark",
            status="processing",
            stage="Processing",
            progress=60
        )

        # Create output path
        output_video = UPLOAD_DIR / display_file_name / f"watermarked_{display_file_name}.{output_format}"
        logger.info(f"Output video will be saved to: {output_video}")
        
        # Update progress to applying watermark
        job.progress = 80
        job.current_stage = "Applying Watermark"
        await add_job(job)
        
        # Add log for applying watermark
        await add_log(
            job_id=job_db_id,
            action="Apply watermark",
            details=f"Applying watermark at position {watermark_position}",
            status="processing",
            stage="Applying Watermark",
            progress=80
        )

        # Apply watermark with position
        success = add_watermark(
            str(input_video), 
            str(watermark_path), 
            str(output_video), 
            output_format,
            watermark_position
        )
        if not success:
            logger.error("Watermarking failed")
            job.status = "error"
            job.current_stage = "Error"
            await add_job(job)
            
            # Add error log
            await add_log(
                job_id=job_db_id,
                action="Apply watermark",
                details="Failed to apply watermark",
                status="error",
                stage="Error",
                progress=0
            )
            
            raise HTTPException(status_code=500, detail="Failed to apply watermark")

        # Update job status to completed
        job.status = "completed"
        job.progress = 100
        job.current_stage = "Completed"
        job.file_size = os.path.getsize(output_video)
        await add_job(job)
        
        # Add completion log
        await add_log(
            job_id=job_db_id,
            action="Complete",
            details=f"Processing completed successfully. Output file size: {os.path.getsize(output_video)} bytes",
            status="completed",
            stage="Completed",
            progress=100
        )

        # Return the watermarked file
        response = FileResponse(
            path=str(output_video),
            filename=f"watermarked_{display_file_name}.{output_format}",
            media_type=f"video/{output_format}"
        )

        # Add cleanup callback
        async def cleanup():
            try:
                temp_dir = UPLOAD_DIR / display_file_name
                if temp_dir.exists():
                    shutil.rmtree(temp_dir)
                    logger.info(f"Cleaned up directory: {temp_dir}")
            except Exception as e:
                logger.error(f"Error cleaning up directory: {e}")

        response.background = BackgroundTasks()
        response.background.add_task(cleanup)

        return response
    except Exception as e:
        logger.exception(f"Error in watermark processing: {e}")
        # Update job history with error if job was created
        if 'job' in locals() and job_db_id:
            job.status = "error"
            job.current_stage = "Error"
            await add_job(job)
            
            # Add error log
            await add_log(
                job_id=job_db_id,
                action="Error",
                details=str(e),
                status="error",
                stage="Error",
                progress=0
            )
        
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcode/process")
async def process_transcode(
    file_name: str = Form(...),
    output_format: str = Form("mp4"),
    user_id: str = Form(...),
    user_name: str = Form(None),
    user_email: str = Form(None),
    job_id: str = Form(None),
    original_file_name: str = Form(None)  # Add parameter for original file name
):
    job_db_id = None
    try:
        logger.info(f"Starting transcoding with:")
        logger.info(f"File name: {file_name}")
        logger.info(f"Original file name: {original_file_name}")
        logger.info(f"Output format: {output_format}")
        logger.info(f"User ID: {user_id}")
        logger.info(f"Frontend job ID: {job_id}")

        # Use original file name if provided, otherwise use file_name (upload ID)
        display_file_name = original_file_name if original_file_name else file_name

        # Create initial job history entry
        job = JobHistoryCreate(
            user_id=user_id,
            user_name=user_name,
            user_email=user_email,
            file_name=display_file_name,
            file_size=0,  # Will be updated after processing
            file_type="video/mp4",
            status="processing",
            output_format=output_format,
            processing_type="transcode",
            progress=0,
            current_stage="Initializing",
            frontend_id=job_id  # Store the frontend job ID for reference
        )
        job_record = await add_job(job)
        
        # Store the job ID as a string to ensure consistency
        job_db_id = str(job_record.id)
        logger.info(f"Created job with DB ID: {job_db_id}")
        
        # Add initial log
        await add_log(
            job_id=job_db_id,
            action="Initialize processing",
            details=f"Starting transcoding for file {file_name}",
            status="processing",
            stage="Initializing",
            progress=0
        )

        # Validate output format
        if not validate_format(output_format):
            logger.error(f"Unsupported output format: {output_format}")
            job.status = "error"
            job.current_stage = "Error"
            await add_job(job)
            
            await add_log(
                job_id=job_db_id,
                action="Validate format",
                details=f"Unsupported output format: {output_format}",
                status="error",
                stage="Error",
                progress=0
            )
            
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported output format. Supported formats: {', '.join(SUPPORTED_FORMATS)}"
            )
        
        # Update progress to uploading
        job.progress = 20
        job.current_stage = "Uploading"
        await add_job(job)
        
        # Add log for upload
        await add_log(
            job_id=job_db_id,
            action="Upload video",
            details=f"Video file {file_name} uploaded",
            status="processing",
            stage="Uploading",
            progress=20
        )

        # Get the uploaded file path
        input_file = UPLOAD_DIR / file_name / f"{file_name}.mp4"
        logger.info(f"Processing transcode for file: {input_file}")
        
        if not input_file.exists():
            logger.error(f"File not found: {input_file}")
            job.status = "error"
            job.current_stage = "Error"
            await add_job(job)
            
            # Add error log
            await add_log(
                job_id=job_db_id,
                action="Locate video file",
                details=f"File not found: {input_file}",
                status="error",
                stage="Error",
                progress=0
            )
            
            raise HTTPException(status_code=404, detail=f"File not found: {input_file}")
        
        # Update progress to processing
        job.progress = 50
        job.current_stage = "Processing"
        await add_job(job)
        
        # Add log for processing
        await add_log(
            job_id=job_db_id,
            action="Processing",
            details=f"Transcoding to {output_format} format",
            status="processing",
            stage="Processing", 
            progress=50
        )

        # Create output directory if it doesn't exist
        output_dir = UPLOAD_DIR / file_name
        output_dir.mkdir(exist_ok=True, parents=True)
        
        # Define output file path
        output_file = output_dir / f"transcoded_{display_file_name}.{output_format}"
        logger.info(f"Output file will be at: {output_file}")

        # Here we would normally do actual transcoding with FFMPEG
        # For simplicity, we're just copying the file for now
        # In a real application, replace this with your transcoding logic
        try:
            # Simple file copy for demonstration (replace with real transcoding)
            shutil.copy(input_file, output_file)
            logger.info(f"File copied from {input_file} to {output_file}")
        except Exception as e:
            logger.error(f"Error during transcoding: {e}")
            job.status = "error"
            job.current_stage = "Error"
            await add_job(job)
            
            await add_log(
                job_id=job_db_id,
                action="Transcode",
                details=f"Failed to transcode: {str(e)}",
                status="error",
                stage="Error",
                progress=0
            )
            
            raise HTTPException(status_code=500, detail=f"Transcoding failed: {str(e)}")
        
        # Update progress to finalizing
        job.progress = 80
        job.current_stage = "Finalizing"
        await add_job(job)
        
        await add_log(
            job_id=job_db_id,
            action="Finalizing",
            details="Finalizing transcoded file",
            status="processing",
            stage="Finalizing",
            progress=80
        )
        
        # Update job status to completed
        job.status = "completed"
        job.progress = 100
        job.current_stage = "Completed"
        job.file_size = os.path.getsize(output_file)
        await add_job(job)
        
        # Add completion log
        await add_log(
            job_id=job_db_id,
            action="Complete",
            details=f"Transcoding completed successfully. Output file size: {os.path.getsize(output_file)} bytes",
            status="completed",
            stage="Completed",
            progress=100
        )

        # Return the transcoded file
        response = FileResponse(
            path=str(output_file),
            filename=f"transcoded_{display_file_name}.{output_format}",
            media_type=f"video/{output_format}"
        )

        # Add cleanup callback
        async def cleanup():
            try:
                # Wait a bit to ensure the file is fully sent before cleanup
                await asyncio.sleep(10)
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
        logger.exception(f"Error in transcoding: {e}")
        # Update job history with error if job was created
        if 'job' in locals() and job_db_id:
            job.status = "error"
            job.current_stage = "Error"
            await add_job(job)
            
            # Add error log
            await add_log(
                job_id=job_db_id,
                action="Error",
                details=str(e),
                status="error",
                stage="Error",
                progress=0
            )
        
        raise HTTPException(status_code=500, detail=str(e)) 