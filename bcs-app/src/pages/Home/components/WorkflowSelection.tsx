import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { auth, signInWithGoogle } from "../../../Firebase/firebaseconfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Progress } from "../../../ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../ui/tabs";

interface WorkflowSelectionProps {
  initialFile: File | null;
  onProcessingComplete: (url: string, fileName: string, format: string) => void;
  onError: (error: string) => void;
  onProcessingStart: () => void;
  isDisabled?: boolean;
}

const WorkflowSelection: React.FC<WorkflowSelectionProps> = ({
  initialFile,
  onProcessingComplete,
  onError,
  onProcessingStart,
  isDisabled = false
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [outputFormat, setOutputFormat] = useState<string>('mp4');
  const [progress, setProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [watermarkPosition, setWatermarkPosition] = useState<string>('top-right');
  const [activeTab, setActiveTab] = useState<string>('transcode');

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
      
      const response = await fetch(`http://localhost:8000/api${endpoint}/chunk`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.status === 'complete') {
        uploadId = data.file_id;
      } else if (data.upload_id) {
        uploadId = data.upload_id;
      }
      
      // Update progress
      setProgress(Math.round((i / chunks) * 100));
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

    if (!initialFile) {
      onError("No file selected");
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

  const handleProcess = async () => {
    if (!initialFile) {
      onError('No file selected');
      return;
    }

    try {
      setIsProcessing(true);
      onProcessingStart();
      setProgress(0);

      // Upload the video file in chunks
      const videoUploadId = await uploadFileInChunks(
        initialFile,
        activeTab === 'watermark' ? '/add-watermark' : '/transcode'
      );

      if (activeTab === 'watermark' && watermarkFile) {
        // Upload the watermark file in chunks
        const watermarkUploadId = await uploadFileInChunks(watermarkFile, '/add-watermark');

        // Process the video with watermark
        const processFormData = new FormData();
        processFormData.append('file_name', videoUploadId);
        processFormData.append('output_format', outputFormat);
        processFormData.append('watermark_image', watermarkFile);
        processFormData.append('watermark_position', watermarkPosition);

        const processResponse = await fetch('http://localhost:8000/api/add-watermark/process', {
          method: 'POST',
          body: processFormData,
        });

        if (!processResponse.ok) {
          throw new Error(`Processing failed: ${processResponse.statusText}`);
        }

        const blob = await processResponse.blob();
        const url = URL.createObjectURL(blob);
        
        // Create a video element to verify the output
        const video = document.createElement('video');
        video.src = url;
        video.onloadeddata = () => {
          onProcessingComplete(url, initialFile.name, outputFormat);
        };
        video.onerror = () => {
          throw new Error('Failed to load processed video');
        };
      } else {
        // Process the video without watermark
        const processFormData = new FormData();
        processFormData.append('file_name', videoUploadId);
        processFormData.append('output_format', outputFormat);

        const processResponse = await fetch('http://localhost:8000/api/transcode/process', {
          method: 'POST',
          body: processFormData,
        });

        if (!processResponse.ok) {
          throw new Error(`Processing failed: ${processResponse.statusText}`);
        }

        const blob = await processResponse.blob();
        const url = URL.createObjectURL(blob);
        
        // Create a video element to verify the output
        const video = document.createElement('video');
        video.src = url;
        video.onloadeddata = () => {
          onProcessingComplete(url, initialFile.name, outputFormat);
        };
        video.onerror = () => {
          throw new Error('Failed to load processed video');
        };
      }

      setIsProcessing(false);
      setShowModal(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Processing failed');
      setIsProcessing(false);
    }
  };

  if (isAuthLoading) {
    return (
      <Card className="bg-gray-800 text-white">
        <CardContent className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        </CardContent>
      </Card>
    );
  }

  if (!currentUser) {
    return (
      <Card className="bg-gray-800 text-white">
        <CardContent className="p-6 text-center">
          <h2 className="text-xl mb-4">Please sign in to process videos</h2>
          <Button 
            onClick={handleSignIn} 
            className="w-full bg-white text-black hover:bg-gray-100"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In with Google'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gray-800 text-white">
        <CardHeader>
          <CardTitle>Processing Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Processing Type</Label>
            <Button
              onClick={() => setShowModal(true)}
              className="w-full bg-white text-black hover:bg-gray-100"
              disabled={isDisabled || isProcessing}
            >
              Process Video
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Processing Options</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transcode">Transcode</TabsTrigger>
              <TabsTrigger value="watermark">Add Watermark</TabsTrigger>
            </TabsList>

            <TabsContent value="transcode" className="space-y-4">
              {initialFile && (
                <div className="space-y-2">
                  <Label>Selected File</Label>
                  <p className="text-sm text-gray-400">{initialFile.name}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Output Format</Label>
                <Select 
                  value={outputFormat} 
                  onValueChange={setOutputFormat}
                  disabled={isProcessing}
                >
                  <SelectTrigger className="bg-gray-700 text-white">
                    <SelectValue placeholder="Select output format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp4">MP4</SelectItem>
                    <SelectItem value="webm">WebM</SelectItem>
                    <SelectItem value="avi">AVI</SelectItem>
                    <SelectItem value="mov">MOV</SelectItem>
                    <SelectItem value="flv">FLV</SelectItem>
                    <SelectItem value="mkv">MKV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="watermark" className="space-y-4">
              {initialFile && (
                <div className="space-y-2">
                  <Label>Selected File</Label>
                  <p className="text-sm text-gray-400">{initialFile.name}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Output Format</Label>
                <Select 
                  value={outputFormat} 
                  onValueChange={setOutputFormat}
                  disabled={isProcessing}
                >
                  <SelectTrigger className="bg-gray-700 text-white">
                    <SelectValue placeholder="Select output format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp4">MP4</SelectItem>
                    <SelectItem value="webm">WebM</SelectItem>
                    <SelectItem value="avi">AVI</SelectItem>
                    <SelectItem value="mov">MOV</SelectItem>
                    <SelectItem value="flv">FLV</SelectItem>
                    <SelectItem value="mkv">MKV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Watermark Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setWatermarkFile(file);
                  }}
                  className="bg-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label>Watermark Position</Label>
                <Select 
                  value={watermarkPosition} 
                  onValueChange={setWatermarkPosition}
                  disabled={isProcessing}
                >
                  <SelectTrigger className="bg-gray-700 text-white">
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top-left">Top Left</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          {isProcessing && (
            <div className="space-y-2">
              <Label>Processing Progress</Label>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-gray-400">{progress}%</p>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setShowModal(false)}
              className="bg-white text-black hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleProcess}
              disabled={isProcessing || !initialFile || (activeTab === 'watermark' && !watermarkFile)}
              className="bg-black text-white hover:bg-gray-800"
            >
              {isProcessing ? 'Processing...' : 'Process Video'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkflowSelection;