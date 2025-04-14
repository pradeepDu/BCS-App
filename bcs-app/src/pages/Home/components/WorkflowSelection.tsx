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
import { v4 as uuidv4 } from 'uuid';

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
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [watermarkPosition, setWatermarkPosition] = useState<string>('top-right');
  const [activeTab, setActiveTab] = useState<string>('transcode');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const storedJob = localStorage.getItem('currentJob');
    if (storedJob) {
      try {
        const job = JSON.parse(storedJob);
        if (job.status === 'completed' && job.outputUrl) {
          if (job.userId === currentUser?.uid) {
            setIsComplete(true);
            setOutputUrl(job.outputUrl);
            setCurrentJobId(job.jobId);
          }
        }
      } catch (e) {
        console.error("Error parsing stored job:", e);
        localStorage.removeItem('currentJob');
      }
    }
  }, [currentUser]);

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
      detail: { 
        stage, 
        progress, 
        message,
        timestamp: new Date().toISOString(),
        jobId: currentJobId,
        processingType: activeTab,
        fileName: initialFile?.name || '',
        fileSize: initialFile?.size || 0,
        fileType: initialFile?.type || '',
        userId: currentUser?.uid || '',
        userName: currentUser?.displayName || '',
        userEmail: currentUser?.email || '',
        outputUrl: outputUrl
      }
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

  const uploadFileInChunks = async (file: File, fileType: string): Promise<string> => {
    const chunkSize = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadId = null;

    for (let i = 0; i < totalChunks; i++) {
      const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('total_chunks', totalChunks.toString());
      formData.append('current_chunk', i.toString());
      if (uploadId) {
        formData.append('upload_id', uploadId);
      }

      try {
        // Use video_processing router for all uploads
        // Map the fileType to the correct endpoint
        const endpoint = fileType === 'transcode' 
          ? 'http://localhost:8000/api/video-processing/transcode/chunk' 
          : 'http://localhost:8000/api/video-processing/add-watermark/chunk';

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Chunk upload failed: ${errorText}`);
        }

        const result = await response.json();
        uploadId = result.upload_id || result.file_id;

        // Calculate and update upload progress
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        setUploadProgress(progress);

        // If this is the last chunk and upload is complete
        if (i === totalChunks - 1 && result.status === 'complete') {
          return uploadId;
        }
      } catch (error) {
        console.error('Error uploading chunk:', error);
        throw error;
      }
    }

    // If we get here, the upload didn't complete
    throw new Error('Upload failed to complete');
  };

  const handleProcess = async () => {
    if (!currentUser) {
      onError('Please log in to process videos');
      return;
    }

    if (!initialFile) {
      onError('Please select a file first');
      return;
    }

    try {
      setIsProcessing(true);
      setIsComplete(false);
      setOutputUrl(null);
      onProcessingStart();
      
      // Generate a unique job ID for this processing session
      const jobId = uuidv4();
      setCurrentJobId(jobId);
      
      // Store job details in localStorage for persistence
      localStorage.setItem('currentJob', JSON.stringify({
        jobId,
        processingType: activeTab,
        fileName: initialFile.name,
        fileSize: initialFile.size,
        fileType: initialFile.type,
        userId: currentUser.uid,
        userName: currentUser.displayName,
        userEmail: currentUser.email,
        status: 'processing',
        progress: 0,
        currentStage: 'Initializing',
        outputUrl: null
      }));
      
      dispatchProgressUpdate(0, 0, "Initializing...");

      // Upload the video file in chunks
      dispatchProgressUpdate(1, 20, "Uploading video file...");
      const videoUploadId = await uploadFileInChunks(
        initialFile,
        activeTab === 'watermark' ? 'watermark' : 'transcode'
      );
      dispatchProgressUpdate(2, 40, "Video file uploaded successfully");

      if (activeTab === 'watermark' && watermarkFile) {
        // Upload the watermark file in chunks
        dispatchProgressUpdate(3, 60, "Uploading watermark...");
        const watermarkUploadId = await uploadFileInChunks(watermarkFile, 'watermark');
        dispatchProgressUpdate(4, 80, "Watermark uploaded successfully");

        // Process the video with watermark
        const processFormData = new FormData();
        processFormData.append('file_name', videoUploadId);
        processFormData.append('output_format', outputFormat);
        processFormData.append('watermark_image', watermarkFile);
        processFormData.append('watermark_position', watermarkPosition);
        processFormData.append('user_id', currentUser.uid);
        processFormData.append('user_name', currentUser.displayName || '');
        processFormData.append('user_email', currentUser.email || '');
        processFormData.append('job_id', jobId);
        processFormData.append('original_file_name', initialFile.name);

        dispatchProgressUpdate(5, 90, "Applying watermark...");
        const processResponse = await fetch('http://localhost:8000/api/video-processing/add-watermark/process', {
          method: 'POST',
          body: processFormData,
        });

        if (!processResponse.ok) {
          throw new Error(`Processing failed: ${processResponse.statusText}`);
        }

        const blob = await processResponse.blob();
        const url = URL.createObjectURL(blob);
        setOutputUrl(url);
        
        dispatchProgressUpdate(6, 100, "Processing completed successfully");
        
        // Update localStorage with COMPLETED status and STABLE URL
        localStorage.setItem('currentJob', JSON.stringify({
          jobId,
          processingType: activeTab,
          fileName: initialFile.name,
          fileSize: initialFile.size,
          fileType: initialFile.type,
          userId: currentUser.uid,
          userName: currentUser.displayName,
          userEmail: currentUser.email,
          status: 'completed',
          progress: 100,
          currentStage: 'Completed',
          outputUrl: url
        }));
        
        setIsComplete(true);
        onProcessingComplete(url, initialFile.name, outputFormat);
      } else {
        // Process the video without watermark (transcode)
        const processFormData = new FormData();
        processFormData.append('file_name', videoUploadId);
        processFormData.append('output_format', outputFormat);
        processFormData.append('user_id', currentUser.uid);
        processFormData.append('user_name', currentUser.displayName || '');
        processFormData.append('user_email', currentUser.email || '');
        processFormData.append('job_id', jobId);
        processFormData.append('original_file_name', initialFile.name);

        dispatchProgressUpdate(3, 60, "Transcoding video...");
        
        // Fix the endpoint - use the correct video processing endpoint for transcode
        const processResponse = await fetch('http://localhost:8000/api/video-processing/transcode/process', {
          method: 'POST',
          body: processFormData,
        });

        if (!processResponse.ok) {
          throw new Error(`Processing failed: ${processResponse.statusText}`);
        }

        const blob = await processResponse.blob();
        const url = URL.createObjectURL(blob);
        setOutputUrl(url);
        
        dispatchProgressUpdate(4, 100, "Processing completed successfully");
        
        // Update localStorage with completed status and output URL
        localStorage.setItem('currentJob', JSON.stringify({
          jobId,
          processingType: activeTab,
          fileName: initialFile.name,
          fileSize: initialFile.size,
          fileType: initialFile.type,
          userId: currentUser.uid,
          userName: currentUser.displayName,
          userEmail: currentUser.email,
          status: 'completed',
          progress: 100,
          currentStage: 'Completed',
          outputUrl: url
        }));
        
        setIsComplete(true);
        onProcessingComplete(url, initialFile.name, outputFormat);
      }

      setIsProcessing(false);
      setShowModal(false);
    } catch (error) {
      dispatchProgressUpdate(-1, 0, `Error: ${error instanceof Error ? error.message : 'Processing failed'}`);
      onError(error instanceof Error ? error.message : 'Processing failed');
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (outputUrl) {
      const link = document.createElement('a');
      link.href = outputUrl;
      const baseName = initialFile?.name.split('.').slice(0, -1).join('.') || 'processed_file';
      const extension = outputFormat;
      link.download = `${baseName}_${activeTab}_processed.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-gray-400">{uploadProgress}%</p>
            </div>
          )}

          {isComplete && outputUrl && (
            <div className="mt-4">
              <Button
                onClick={handleDownload}
                className="w-full bg-green-500 text-white hover:bg-green-600"
              >
                Download Processed Video
              </Button>
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