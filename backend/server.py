from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse
import os
import shutil
import ffmpeg
import logging
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # More permissive for debugging
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Temporary directory to store uploaded files
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def transcode_video(input_file: str, output_file: str, output_format: str = "mp4") -> bool:
    """
    Transcodes a video file to another format using FFmpeg.
    """
    try:
        if not os.path.exists(input_file):
            raise FileNotFoundError(f"Input file '{input_file}' not found.")

        logger.info(f"Transcoding video from {input_file} to {output_file} with format {output_format}")
        
        # For WebM output, use VP9 video codec and Opus audio codec
        if output_format.lower() == "webm":
            logger.info("Using WebM specific codecs: libvpx-vp9 and libopus")
            (
                ffmpeg
                .input(input_file)
                .output(output_file, format=output_format, vcodec="libvpx-vp9", acodec="libopus")
                .run(overwrite_output=True, capture_stdout=True, capture_stderr=True)
            )
        else:
            logger.info(f"Using default codecs for {output_format}: libx264 and aac")
            (
                ffmpeg
                .input(input_file)
                .output(output_file, format=output_format, vcodec="libx264", acodec="aac")
                .run(overwrite_output=True, capture_stdout=True, capture_stderr=True)
            )
        
        if not os.path.exists(output_file):
            logger.error(f"Transcoding failed: Output file doesn't exist")
            return False
            
        if os.path.getsize(output_file) == 0:
            logger.error(f"Transcoding failed: Output file is empty")
            return False
            
        logger.info(f"Transcoding successful. Output file size: {os.path.getsize(output_file)} bytes")
        return True
    except ffmpeg.Error as e:
        logger.error("An error occurred while transcoding the video:")
        logger.error(e.stderr.decode() if e.stderr else str(e))
        return False
    except Exception as e:
        logger.error(f"Unexpected error in transcode_video: {str(e)}")
        return False

def add_watermark(input_video: str, watermark_image: str, output_video: str) -> bool:
    """
    Adds a watermark (logo) to the top-right corner of a video.
    """
    try:
        if not os.path.exists(input_video):
            raise FileNotFoundError(f"Input video '{input_video}' not found.")
        if not os.path.exists(watermark_image):
            raise FileNotFoundError(f"Watermark image '{watermark_image}' not found.")

        logger.info(f"Adding watermark to video: {input_video}")
        (
            ffmpeg
            .input(input_video)
            .output(
                output_video,
                vf=f"movie={watermark_image}[watermark];[in][watermark]overlay=W-w-10:10",
                vcodec="libx264",
                acodec="aac"
            )
            .run(overwrite_output=True, capture_stdout=True, capture_stderr=True)
        )
        
        if not os.path.exists(output_video) or os.path.getsize(output_video) == 0:
            logger.error(f"Watermarking failed: Output file is empty or doesn't exist")
            return False
            
        return True
    except ffmpeg.Error as e:
        logger.error("An error occurred while adding the watermark:")
        logger.error(e.stderr.decode() if e.stderr else str(e))
        return False
    except Exception as e:
        logger.error(f"Unexpected error in add_watermark: {str(e)}")
        return False

@app.post("/transcode/")
async def transcode_endpoint(
    input_file: UploadFile = File(...),
    output_format: str = Form("mp4")
):
    """
    Transcodes an uploaded video file to the specified format.
    """
    logger.info(f"Received file: {input_file.filename}, format: {output_format}")
    logger.info(f"File content type: {input_file.content_type}")
    
    # Validate output format
    supported_formats = ["mp4", "webm", "avi", "mov", "mkv"]
    if output_format.lower() not in supported_formats:
        logger.warning(f"Unsupported output format requested: {output_format}")
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported output format. Supported formats: {', '.join(supported_formats)}"
        )
    
    # Create a unique filename
    unique_id = os.urandom(4).hex()
    input_path = os.path.join(UPLOAD_DIR, f"{unique_id}_input{Path(input_file.filename).suffix}")
    output_filename = f"transcoded_{unique_id}.{output_format}"
    output_path = os.path.join(UPLOAD_DIR, output_filename)

    try:
        # Save the uploaded file
        with open(input_path, "wb") as buffer:
            content = await input_file.read()
            buffer.write(content)
        
        logger.info(f"Saved input file to {input_path}, size: {os.path.getsize(input_path)} bytes")

        # Transcode the video
        success = transcode_video(input_path, output_path, output_format)
        if not success:
            raise HTTPException(status_code=500, detail="Transcoding failed. Check server logs for details.")

        logger.info(f"Transcoding completed. Output file: {output_path}, size: {os.path.getsize(output_path)} bytes")

        # Return the transcoded file as a response
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
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
    finally:
        # Clean up the input file
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
                logger.info(f"Input file cleaned up: {input_path}")
            except Exception as e:
                logger.error(f"Failed to clean up input file: {str(e)}")

@app.post("/add-watermark/")
async def add_watermark_endpoint(
    input_video: UploadFile = File(...),
    watermark_image: UploadFile = File(...)
):
    """
    Adds a watermark to an uploaded video file.
    """
    # Create unique filenames
    unique_id = os.urandom(4).hex()
    video_path = os.path.join(UPLOAD_DIR, f"{unique_id}_video{Path(input_video.filename).suffix}")
    watermark_path = os.path.join(UPLOAD_DIR, f"{unique_id}_watermark{Path(watermark_image.filename).suffix}")
    output_filename = f"watermarked_{unique_id}.mp4"
    output_path = os.path.join(UPLOAD_DIR, output_filename)

    try:
        # Save the uploaded files
        with open(video_path, "wb") as buffer:
            content = await input_video.read()
            buffer.write(content)
        
        with open(watermark_path, "wb") as buffer:
            content = await watermark_image.read()
            buffer.write(content)

        logger.info(f"Saved input files: {video_path} (size: {os.path.getsize(video_path)} bytes), {watermark_path} (size: {os.path.getsize(watermark_path)} bytes)")

        # Add watermark to the video
        success = add_watermark(video_path, watermark_path, output_path)
        if not success:
            raise HTTPException(status_code=500, detail="Adding watermark failed. Check server logs for details.")

        logger.info(f"Watermarking completed. Output file: {output_path}, size: {os.path.getsize(output_path)} bytes")

        # Return the watermarked file as a response
        return FileResponse(
            path=output_path,
            media_type="video/mp4",
            filename=f"watermarked_{Path(input_video.filename).stem}.mp4"
        )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error in watermark endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
    finally:
        # Clean up only the input files, not the output
        for temp_file in [video_path, watermark_path]:
            if os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                    logger.info(f"Input file cleaned up: {temp_file}")
                except Exception as e:
                    logger.error(f"Failed to clean up file {temp_file}: {str(e)}")

@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify the API is running.
    """
    return {"status": "healthy", "version": "1.0.0"}

# Add a new endpoint to check FFmpeg capabilities
@app.get("/ffmpeg-info")
async def ffmpeg_info():
    """
    Returns information about the FFmpeg installation and available codecs.
    """
    try:
        # Get FFmpeg version
        version_process = os.popen("ffmpeg -version")
        version_info = version_process.read()
        version_process.close()
        
        # Get available codecs
        codecs_process = os.popen("ffmpeg -codecs")
        codecs_info = codecs_process.read()
        codecs_process.close()
        
        return {
            "status": "success",
            "ffmpeg_version": version_info.split('\n')[0] if version_info else "Unknown",
            "webm_support": "libvpx" in codecs_info and "libopus" in codecs_info,
            "codecs_available": {
                "libx264": "libx264" in codecs_info,
                "libvpx-vp9": "libvpx" in codecs_info,
                "aac": "aac" in codecs_info,
                "libopus": "libopus" in codecs_info
            }
        }
    except Exception as e:
        logger.error(f"Error getting FFmpeg info: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)