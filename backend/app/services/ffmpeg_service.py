import os
import ffmpeg
import subprocess
from app.utils.logging_utils import setup_logging
from app.config import SUPPORTED_FORMATS

logger = setup_logging(__name__)

def get_ffmpeg_info():
    """
    Returns information about the FFmpeg installation and available codecs.
    """
    try:
        # Get FFmpeg version using subprocess instead of os.popen
        version_process = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
        version_info = version_process.stdout
        
        # Get available formats
        formats_process = subprocess.run(["ffmpeg", "-formats"], capture_output=True, text=True)
        formats_info = formats_process.stdout
        
        # Get available codecs
        codecs_process = subprocess.run(["ffmpeg", "-codecs"], capture_output=True, text=True)
        codecs_info = codecs_process.stdout
        
        # Check for specific format support
        mkv_support = "matroska" in formats_info.lower()
        
        return {
            "status": "success",
            "ffmpeg_version": version_info.split('\n')[0] if version_info else "Unknown",
            "formats_supported": {
                "mp4": "mp4" in formats_info.lower(),
                "webm": "webm" in formats_info.lower(),
                "mkv": mkv_support,
                "avi": "avi" in formats_info.lower(),
                "mov": "mov" in formats_info.lower(),
                "flv": "flv" in formats_info.lower(),
            },
            "codecs_available": {
                "libx264": "libx264" in codecs_info,
                "libvpx-vp9": "libvpx" in codecs_info,
                "aac": "aac" in codecs_info,
                "libopus": "libopus" in codecs_info,
                "mpeg4": "mpeg4" in codecs_info,
                "mp3": "mp3" in codecs_info
            }
        }
    except Exception as e:
        logger.error(f"Error getting FFmpeg info: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

def validate_format(output_format):
    """
    Check if the requested output format is supported
    
    Args:
        output_format: Format string to validate
        
    Returns:
        bool: True if the format is supported, False otherwise
    """
    # First check with our predefined supported formats
    if output_format.lower() not in SUPPORTED_FORMATS:
        logger.warning(f"Requested format '{output_format}' not in predefined supported formats")
        return False
    
    # If it's MKV, specifically check for matroska support
    if output_format.lower() == "mkv":
        try:
            info = get_ffmpeg_info()
            return info["formats_supported"].get("mkv", False)
        except Exception as e:
            logger.error(f"Error validating MKV format: {str(e)}")
            return False
    
    return True

def get_codec_settings(output_format):
    """
    Get appropriate codec settings for the given format
    
    Args:
        output_format: The output format to get codec settings for
        
    Returns:
        dict: Dictionary with codec settings (vcodec, acodec)
    """
    format_lower = output_format.lower()
    
    if format_lower == "webm":
        return {
            "vcodec": "libvpx-vp9",
            "acodec": "libopus",
            "format": "webm"
        }
    elif format_lower == "mkv":
        return {
            "vcodec": "libx264",
            "acodec": "aac",
            "format": "matroska"  # Use matroska instead of mkv
        }
    elif format_lower == "avi":
        return {
            "vcodec": "mpeg4",
            "acodec": "mp3",
            "format": "avi"
        }
    else:
        # Default to mp4 compatible codecs for most formats
        return {
            "vcodec": "libx264",
            "acodec": "aac",
            "format": format_lower
        }

def transcode_video(input_file, output_file, output_format="mp4"):
    """
    Transcodes a video file to another format using FFmpeg.
    
    Args:
        input_file: Path to the input video file
        output_file: Path to save the output video file
        output_format: Output format to transcode to
        
    Returns:
        bool: True if transcoding was successful, False otherwise
    """
    try:
        if not os.path.exists(input_file):
            raise FileNotFoundError(f"Input file '{input_file}' not found.")
        
        # Validate the format before proceeding
        if not validate_format(output_format):
            # Default to mp4 if the requested format is not supported
            logger.warning(f"Format '{output_format}' not supported. Defaulting to mp4.")
            output_format = "mp4"
            output_file = os.path.splitext(output_file)[0] + ".mp4"
        
        # Ensure the output directory exists
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        logger.info(f"Transcoding video from {input_file} to {output_file} with format {output_format}")
        
        # Get codec settings
        codec_settings = get_codec_settings(output_format)
        
        # Execute FFmpeg command
        (
            ffmpeg
            .input(input_file)
            .output(
                output_file, 
                **codec_settings
            )
            .run(overwrite_output=True, capture_stdout=True, capture_stderr=True)
        )
        
        # Verify the output file was created successfully
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

def add_watermark(input_video, watermark_image, output_video, output_format=None):
    """
    Adds a watermark (logo) to the top-right corner of a video.
    
    Args:
        input_video: Path to the input video file
        watermark_image: Path to the watermark image file
        output_video: Path to save the output video file
        output_format: Output format (if None, extracted from output_video filename)
        
    Returns:
        bool: True if watermarking was successful, False otherwise
    """
    try:
        if not os.path.exists(input_video):
            raise FileNotFoundError(f"Input video '{input_video}' not found.")
        if not os.path.exists(watermark_image):
            raise FileNotFoundError(f"Watermark image '{watermark_image}' not found.")

        # Get output format from filename extension if not specified
        if not output_format:
            _, ext = os.path.splitext(output_video)
            output_format = ext[1:] if ext else "mp4"
        
        # Validate format and default to mp4 if not supported
        if not validate_format(output_format):
            logger.warning(f"Format '{output_format}' not supported. Defaulting to mp4.")
            output_format = "mp4"
            output_video = os.path.splitext(output_video)[0] + ".mp4"
        
        # Ensure the output directory exists
        os.makedirs(os.path.dirname(output_video), exist_ok=True)
        
        logger.info(f"Adding watermark to video: {input_video} with format {output_format}")
        
        # Get codec settings
        codec_settings = get_codec_settings(output_format)
        
        # Use direct command execution instead of ffmpeg-python for watermarking
        cmd = [
            "ffmpeg", 
            "-i", input_video, 
            "-i", watermark_image,
            "-filter_complex", "[0:v][1:v]overlay=W-w-10:10",
            "-c:v", codec_settings["vcodec"],
            "-c:a", codec_settings["acodec"],
            "-f", codec_settings["format"],
            "-y", output_video
        ]
        
        logger.info(f"Executing command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"FFmpeg command failed with return code {result.returncode}")
            logger.error(f"FFmpeg stderr: {result.stderr}")
            return False
        
        # Verify the output file was created successfully
        if not os.path.exists(output_video):
            logger.error(f"Watermarking failed: Output file doesn't exist")
            return False
            
        if os.path.getsize(output_video) == 0:
            logger.error(f"Watermarking failed: Output file is empty")
            return False
            
        logger.info(f"Watermarking successful. Output file size: {os.path.getsize(output_video)} bytes")
        return True
    except Exception as e:
        logger.error(f"Unexpected error in add_watermark: {str(e)}")
        return False