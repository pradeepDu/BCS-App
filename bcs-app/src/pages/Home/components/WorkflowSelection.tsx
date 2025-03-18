import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../ui/card";
import WorkflowModal from "./WorkflowModal";
import { Button } from "../../../ui/button";

const WorkflowSelection: React.FC = () => {
  const [processedFileUrl, setProcessedFileUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranscoding = async (formData: { 
    file: File; 
    outputFormat: string; 
    watermark?: File;
  }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Create a FormData object to send the file and parameters
      const data = new FormData();
      data.append("input_file", formData.file);
      data.append("output_format", formData.outputFormat || "mp4");
      
      if (formData.watermark) {
        data.append("watermark_image", formData.watermark);
      }
      
      console.log("Sending request with:", {
        file: formData.file.name,
        size: formData.file.size,
        type: formData.file.type,
        outputFormat: formData.outputFormat,
      });
      
      const response = await fetch("http://localhost:8000/transcode/", {
        method: "POST",
        body: data,
        // Don't set Content-Type header - browser will set it with boundary
      });
 
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error:", response.status, errorText);
        throw new Error(`Error: ${response.statusText} - ${errorText}`);
      }
 
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setProcessedFileUrl(url);
    } catch (error) {
      console.error("An error occurred during transcoding:", error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="p-4 h-full bg-gray-800 text-white">
      <CardHeader>
        <CardTitle>Workflow Selection</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <WorkflowModal 
          triggerText="Transcoding" 
          onSubmit={handleTranscoding} 
          isSubmitting={isLoading}
        />
        
        {error && (
          <div className="mt-4 p-3 bg-red-900 text-white rounded">
            Error: {error}
          </div>
        )}
        
        {/* Display Downloadable Output */}
        {processedFileUrl && (
          <div className="mt-4">
            <a href={processedFileUrl} download="processed-video.mp4">
              <Button variant="default">Download Processed Video</Button>
            </a>
            
            <div className="mt-2">
              <video 
                controls 
                className="w-full max-h-64 rounded"
                src={processedFileUrl} 
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkflowSelection;