import ffmpeg
import os

def add_watermark(input_video, watermark_image, output_video):
    """
    Adds a watermark (logo) to the top-right corner of a video.

    :param input_video: Path to the input video file.
    :param watermark_image: Path to the watermark image file (e.g., PNG).
    :param output_video: Path to save the watermarked video file.
    """
    try:
        # Ensure the input files exist
        if not os.path.exists(input_video):
            raise FileNotFoundError(f"Input video '{input_video}' not found.")
        if not os.path.exists(watermark_image):
            raise FileNotFoundError(f"Watermark image '{watermark_image}' not found.")

        print("Adding watermark...")

        # Use FFmpeg to overlay the watermark on the video
        (
            ffmpeg
            .input(input_video)  # Input video
            .output(
                output_video,
                vf=f"movie={watermark_image}[watermark];[in][watermark]overlay=W-w-10:10",
                vcodec="libx264",  # Video codec
                acodec="aac"       # Audio codec
            )
            .run(overwrite_output=True)  # Overwrite output if it exists
        )

        print(f"Watermark added successfully. Output saved to '{output_video}'.")

    except ffmpeg.Error as e:
        print("An error occurred while adding the watermark:")
        if e.stderr:
            print(e.stderr.decode())
        else:
            print(str(e))

# Example usage
if __name__ == "__main__":
    input_video_path = "video2.mp4"  # Replace with your input video file path
    watermark_image_path = "logo.png"     # Replace with your watermark image file path
    output_video_path = "output.mp4"  # Replace with your desired output file path

    # Debugging: Print paths
    print(f"Input video: {os.path.abspath(input_video_path)}")
    print(f"Watermark image: {os.path.abspath(watermark_image_path)}")
    print(f"Output video: {os.path.abspath(output_video_path)}")

    add_watermark(input_video_path, watermark_image_path, output_video_path)