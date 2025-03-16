import ffmpeg
import os

def transcode_video(input_file, output_file, output_format="mp4"):
    """
    Transcodes a video file to another format using FFmpeg.

    :param input_file: Path to the input video file.
    :param output_file: Path to save the transcoded video file.
    :param output_format: Desired output format (e.g., "mp4", "avi", "mkv").
    """
    try:
        # Ensure the input file exists
        if not os.path.exists(input_file):
            raise FileNotFoundError(f"Input file '{input_file}' not found.")

        # Use FFmpeg to transcode the video
        (
            ffmpeg
            .input(input_file)
            .output(output_file, format=output_format, vcodec="libx264", acodec="aac")
            .run(overwrite_output=True)
        )

        print(f"Transcoding completed. Output saved to '{output_file}'.")

    except ffmpeg.Error as e:
        print("An error occurred while transcoding the video:")
        print(e.stderr.decode())

# Example usage
if __name__ == "__main__":
    input_path = "video.mkv"  # Replace with your input file path
    output_path = "video2.mp4"  # Replace with your desired output file path

    transcode_video(input_path, output_path, output_format="mp4")