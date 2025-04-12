import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../ui/card";
import WorkflowModal from "./WorkflowModal";
import { Button } from "../../../ui/button";
import { auth, signInWithGoogle } from "../../../Firebase/firebaseconfig";
import { onAuthStateChanged, User } from "firebase/auth";

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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
      onError('Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const dispatchProgressUpdate = (stage: number, progress: number, message: string) => {
    const event = new CustomEvent('progressUpdate', {
      detail: { stage, progress, message }
    });
    window.dispatchEvent(event);
  };

  const checkServerHealth = async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:8000/api/health');
      const data = await response.json();
      
      if (data.status === 'unhealthy') {
        console.error('Server health check failed:', data.error);
        return false;
      }
      
      return data.status === 'healthy' && data.database === 'connected';
    } catch (error) {
      console.error('Server health check failed:', error);
      return false;
    }
  };

  const retryOperation = async (
    operation: () => Promise<Response>,
    maxRetries: number = 3
  ): Promise<Response> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check server health before each attempt
        const isHealthy = await checkServerHealth();
        if (!isHealthy) {
          throw new Error('Server is not responding. Please try again later.');
        }
        
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff with jitter
          const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Operation failed after maximum retries');
  };

  const uploadFileInChunks = async (file: File, endpoint: string): Promise<string> => {
    const chunkSize = 1024 * 1024; // 1MB chunks
    const chunks = Math.ceil(file.size / chunkSize);
    let uploadId: string | null = null;
    
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('total_chunks', chunks.toString());
      formData.append('current_chunk', i.toString());
      if (uploadId) {
        formData.append('upload_id', uploadId);
      }
      
      try {
        const response = await retryOperation(async () => {
          const res = await fetch(`http://localhost:8000/api${endpoint}/chunk`, {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Upload failed: ${res.statusText} - ${errorText}`);
          }
          return res;
        });

        const data = await response.json();
        
        if (data.status === 'complete') {
          uploadId = data.file_id;
        } else if (data.upload_id) {
          uploadId = data.upload_id;
        }
        
        dispatchProgressUpdate(1, (i / chunks) * 100, `Uploading chunk ${i + 1}/${chunks}`);
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          throw new Error('Connection refused. Please make sure the backend server is running.');
        }
        throw error;
      }
    }
    
    if (!uploadId) {
      throw new Error('Upload failed: No file ID received');
    }
    
    return uploadId;
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
      // Check server health before starting
      const isHealthy = await checkServerHealth();
      if (!isHealthy) {
        throw new Error('Server is not responding. Please try again later.');
      }

      dispatchProgressUpdate(0, 0, "Initializing video processing...");
      
      const endpoint = formData.useWatermark ? "/add-watermark" : "/transcode";
      
      // Upload file in chunks
      const uploadId = await uploadFileInChunks(initialFile, endpoint);
      
      // Send processing request
      const processData = new FormData();
      processData.append("file_name", uploadId);
      processData.append("output_format", formData.outputFormat || "mp4");
      
      if (formData.useWatermark && formData.watermark) {
        processData.append("watermark_image", formData.watermark);
      }
      
      dispatchProgressUpdate(2, 40, "Processing video...");
      
      const response = await retryOperation(async () => {
        const res = await fetch(`http://localhost:8000/api${endpoint}/process`, {
          method: "POST",
          body: processData,
          credentials: 'include',
          headers: {
            'Accept': 'video/*'
          }
        });
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Server response:", errorText);
          throw new Error(`Error: ${res.statusText} - ${errorText}`);
        }
        return res;
      });

      dispatchProgressUpdate(3, 60, "Applying transformations...");

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error("Received empty file from server");
      }
      
      const url = URL.createObjectURL(blob);
      const fileName = formData.useWatermark ? "watermarked-video" : "transcoded-video";
      
      dispatchProgressUpdate(4, 80, "Finalizing output...");
      
      // Record job history with retry mechanism
      await retryOperation(async () => {
        const response = await fetch('http://localhost:8000/api/job-history/jobs/', {
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

        if (!response.ok) {
          throw new Error("Failed to record job history");
        }
        return response;
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
        {isAuthLoading ? (
          <div className="text-center py-4">
            <p>Loading authentication state...</p>
          </div>
        ) : currentUser ? (
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
            <Button 
              variant="default" 
              onClick={handleSignIn} 
              className="bg-white text-black hover:bg-gray-100"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkflowSelection;