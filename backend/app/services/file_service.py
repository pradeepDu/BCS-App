import os
import uuid
import asyncio
from pathlib import Path
from app.utils.logging_utils import setup_logging

logger = setup_logging(__name__)

def save_upload_file(upload_file, directory, prefix=""):
    """
    Save an uploaded file to disk with a unique filename
    
    Args:
        upload_file: FastAPI UploadFile object
        directory: Directory to save the file to
        prefix: Optional prefix for the filename
        
    Returns:
        str: Path to the saved file
    """
    try:
        unique_id = str(uuid.uuid4())
        file_suffix = Path(upload_file.filename).suffix
        filename = f"{prefix}_{unique_id}{file_suffix}" if prefix else f"{unique_id}{file_suffix}"
        file_path = os.path.join(directory, filename)
        
        with open(file_path, "wb") as buffer:
            content = upload_file.file.read()
            buffer.write(content)
        
        logger.info(f"Saved file to {file_path}, size: {os.path.getsize(file_path)} bytes")
        return file_path
    except Exception as e:
        logger.error(f"Error saving upload file: {str(e)}")
        raise e

async def cleanup_files(file_paths, delay=0):
    """
    Clean up files after they're no longer needed
    
    Args:
        file_paths: List of paths to files that should be removed
        delay: Optional delay in seconds before cleaning up files
    """
    if delay > 0:
        await asyncio.sleep(delay)
        
    for path in file_paths:
        try:
            if os.path.exists(path):
                os.remove(path)
                logger.info(f"File cleaned up: {path}")
        except Exception as e:
            logger.error(f"Failed to clean up file {path}: {str(e)}")