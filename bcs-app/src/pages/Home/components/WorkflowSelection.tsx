import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../ui/card";
import WorkflowModal from "./WorkflowModal";
import { Button } from "../../../ui/button";
import { auth, signInWithGoogle } from "../../../Firebase/firebaseconfig";
import { onAuthStateChanged } from "firebase/auth";

interface WorkflowSelectionProps {
  initialFile: File;
  onProcessingComplete: (processedFileUrl: string, fileName: string, format: string) => void;
}

const WorkflowSelection: React.FC<WorkflowSelectionProps> = ({ 
  initialFile,
  onProcessingComplete
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  const dispatchProgressUpdate = (stage: number, progress: number, message: string) => {
    const event = new CustomEvent('progressUpdate', {
      detail: { stage, progress, message }
    });
    window.dispatchEvent(event);
  };

  const handleProcessing = async (formData: { 
    outputFormat: string; 
    watermark?: File;
    useWatermark: boolean;
  }) => {
    if (!currentUser) {
      setError("Please log in to use this service");
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowModal(false);
    
    try {
      // Initialize progress
      dispatchProgressUpdate(0, 0, "Initializing video processing...");
      
      const data = new FormData();
      const endpoint = formData.useWatermark ? "/add-watermark/" : "/transcode/";
      
      if (formData.useWatermark && formData.watermark) {
        data.append("input_video", initialFile);
        data.append("watermark_image", formData.watermark);
        data.append("output_format", formData.outputFormat || "mp4");
      } else {
        data.append("input_file", initialFile);
        data.append("output_format", formData.outputFormat || "mp4");
      }
      
      dispatchProgressUpdate(1, 20, "Reading video file...");
      
      console.log("Sending request to:", endpoint, {
        file: initialFile.name,
        size: initialFile.size,
        type: initialFile.type,
        outputFormat: formData.outputFormat,
        useWatermark: formData.useWatermark
      });
      
      dispatchProgressUpdate(2, 40, "Processing video...");
      
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error:", response.status, errorText);
        throw new Error(`Error: ${response.statusText} - ${errorText}`);
      }

      dispatchProgressUpdate(3, 60, "Applying transformations...");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const fileName = formData.useWatermark ? "watermarked-video" : "transcoded-video";
      
      dispatchProgressUpdate(4, 80, "Finalizing output...");
      
      onProcessingComplete(url, fileName, formData.outputFormat || "mp4");
      
      dispatchProgressUpdate(5, 100, "Processing completed successfully!");
    } catch (error) {
      console.error("An error occurred during processing:", error);
      setError(error instanceof Error ? error.message : String(error));
      dispatchProgressUpdate(-1, 0, `Error: ${error instanceof Error ? error.message : String(error)}`);
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
        {currentUser ? (
          <WorkflowModal 
            triggerText="Process Video"
            onSubmit={handleProcessing}
            isSubmitting={isLoading}
            selectedFile={initialFile}
            open={showModal}
            onOpenChange={setShowModal}
          />
        ) : (
          <div className="text-center py-4">
            <p className="mb-4">Please log in to process your video</p>
            <Button variant="default" onClick={signInWithGoogle}>
              Sign in with Google
            </Button>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-900 text-white rounded">
            Error: {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkflowSelection;