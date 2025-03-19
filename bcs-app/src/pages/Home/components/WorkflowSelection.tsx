import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../ui/card";
import WorkflowModal from "./WorkflowModal";
import { Button } from "../../../ui/button";

interface WorkflowSelectionProps {
  initialFile: File;
}

const WorkflowSelection: React.FC<WorkflowSelectionProps> = ({ initialFile }) => {
  const [processedFileUrl, setProcessedFileUrl] = useState<string | null>(null);
  const [processedFileFormat, setProcessedFileFormat] = useState<string>("mp4");
  const [processedFileName, setProcessedFileName] = useState<string>("processed-video");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcessing = async (formData: { 
    outputFormat: string; 
    watermark?: File;
    useWatermark: boolean;
  }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = new FormData();
      const endpoint = formData.useWatermark ? "/add-watermark/" : "/transcode/";
      
      if (formData.useWatermark && formData.watermark) {
        data.append("input_video", initialFile);
        data.append("watermark_image", formData.watermark);
        data.append("output_format", formData.outputFormat || "mp4");
        setProcessedFileName("watermarked-video");
      } else {
        data.append("input_file", initialFile);
        data.append("output_format", formData.outputFormat || "mp4");
        setProcessedFileName("transcoded-video");
      }
      
      setProcessedFileFormat(formData.outputFormat || "mp4");
      
      console.log("Sending request to:", endpoint, {
        file: initialFile.name,
        size: initialFile.size,
        type: initialFile.type,
        outputFormat: formData.outputFormat,
        useWatermark: formData.useWatermark
      });
      
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        body: data,
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
      console.error("An error occurred during processing:", error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="p-4 h-full bg-gray-800 text-white">
      <CardHeader>
        <CardTitle>Video Processing Workflow</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <WorkflowModal 
          triggerText="Process Video"
          onSubmit={handleProcessing}
          isSubmitting={isLoading} selectedFile={initialFile} />
        
        {error && (
          <div className="mt-4 p-3 bg-red-900 text-white rounded">
            Error: {error}
          </div>
        )}
        
        {/* Display Downloadable Output */}
        {processedFileUrl && (
          <div className="mt-4">
            <a 
              href={processedFileUrl} 
              download={`${processedFileName}.${processedFileFormat}`}
              className="block mb-2"
            >
              <Button variant="default">Download Processed Video (.{processedFileFormat})</Button>
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