import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../ui/card";
import WorkflowModal from "./WorkflowModal";
import { Button } from "../../../ui/button";
import { auth, signInWithGoogle } from "../../../Firebase/firebaseconfig";
import { onAuthStateChanged } from "firebase/auth";

interface WorkflowSelectionProps {
  initialFile: File;
  onProcessingComplete: (processedFileUrl: string, fileName: string, format: string) => void;
  onError: (errorMessage: string) => void;
  onProcessingStart: () => void;
}

const WorkflowSelection: React.FC<WorkflowSelectionProps> = ({ 
  initialFile,
  onProcessingComplete,
  onError
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
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

  const retryOperation = async (operation: () => Promise<Response>, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  };

  const uploadFileInChunks = async (file: File, endpoint: string) => {
    const chunkSize = 1024 * 1024; // 1MB chunks
    const chunks = Math.ceil(file.size / chunkSize);
    const formData = new FormData();
    
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      formData.append(`chunk_${i}`, chunk);
      formData.append('total_chunks', chunks.toString());
      formData.append('current_chunk', i.toString());
      
      await retryOperation(async () => {
        const response = await fetch(`http://localhost:8000${endpoint}/chunk`, {
          method: "POST",
          body: formData,
        });
        if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
        return response;
      });
      
      dispatchProgressUpdate(1, (i / chunks) * 100, `Uploading chunk ${i + 1}/${chunks}`);
    }
  };

  const handleProcessing = async (formData: { 
    outputFormat: string; 
    watermark?: File;
    useWatermark: boolean;
  }) => {
    if (!currentUser) {
      onError("Please log in to use this service");
      return;
    }

    setIsLoading(true);
    setShowModal(false);
    
    try {
      dispatchProgressUpdate(0, 0, "Initializing video processing...");
      
      const endpoint = formData.useWatermark ? "/add-watermark" : "/transcode";
      
      // Upload file in chunks
      await uploadFileInChunks(initialFile, endpoint);
      
      // Send processing request
      const processData = new FormData();
      processData.append("file_name", initialFile.name);
      processData.append("output_format", formData.outputFormat || "mp4");
      
      if (formData.useWatermark && formData.watermark) {
        processData.append("watermark_image", formData.watermark);
      }
      
      dispatchProgressUpdate(2, 40, "Processing video...");
      
      const response = await retryOperation(async () => {
        const res = await fetch(`http://localhost:8000${endpoint}/process`, {
          method: "POST",
          body: processData,
        });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Error: ${res.statusText} - ${errorText}`);
        }
        return res;
      });

      dispatchProgressUpdate(3, 60, "Applying transformations...");

      if (!response) {
        throw new Error("Response is undefined");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const fileName = formData.useWatermark ? "watermarked-video" : "transcoded-video";
      
      dispatchProgressUpdate(4, 80, "Finalizing output...");
      
      // Record job history with retry mechanism
      await retryOperation(async () => {
        const jobHistoryResponse = await fetch('http://localhost:8000/api/job-history/jobs/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            user_id: currentUser.uid,
            user_name: currentUser.displayName,
            user_email: currentUser.email,
            file_name: initialFile.name,
            file_size: initialFile.size,
            file_type: initialFile.type,
            status: 'completed',
            timestamp: new Date().toISOString(),
            output_format: formData.outputFormat || "mp4",
            processing_type: formData.useWatermark ? 'watermark' : 'transcode'
          })
        });

        if (!jobHistoryResponse.ok) {
          throw new Error("Failed to record job history");
        }
        return jobHistoryResponse; // Ensure a Response object is returned
      });
      
      onProcessingComplete(url, fileName, formData.outputFormat || "mp4");
      
      dispatchProgressUpdate(5, 100, "Processing completed successfully!");
    } catch (error) {
      console.error("An error occurred during processing:", error);
      onError(error instanceof Error ? error.message : String(error));
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
            <Button variant="default" onClick={signInWithGoogle} className="bg-white text-black hover:bg-gray-100">
              Sign in with Google
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkflowSelection;