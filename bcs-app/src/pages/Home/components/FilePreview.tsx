import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { auth, signInWithGoogle } from "../../../Firebase/firebaseconfig"; // Import from your Firebase config
import { onAuthStateChanged } from "firebase/auth";
import WorkflowModal from "./WorkflowModal";

interface FilePreviewProps {
  onFileSelect: (file: File) => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ onFileSelect }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  // Handle file upload via file input
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      onFileSelect(selectedFile);
    }
  };

  // Handle drag-and-drop events
  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Prevent default behavior to allow dropping
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const droppedFile = event.dataTransfer.files[0];
      setFile(droppedFile);
      onFileSelect(droppedFile);
    }
  };

  // Handle workflow submission
  const handleWorkflowSubmit = (data: { 
    outputFormat: string; 
    watermark?: File;
    useWatermark: boolean;
  }) => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    if (!currentUser) {
      alert("Please log in to use this service");
      return;
    }

    // Process the file with the workflow settings
    // Combine file from FilePreview with other settings from WorkflowModal
    const fullData = {
      file,
      ...data
    };
    
    console.log("Processing:", fullData);
    // Your processing logic here
  };

  return (
    <Card className="p-4 h-full bg-gray-800 text-white">
      <CardHeader>
        <CardTitle>File Preview</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Drop Zone */}
        <div
          className={`border-dashed border-2 ${
            isDragging ? "border-blue-500" : "border-gray-600"
          } p-4 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-700 h-64`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          {file ? (
            <p>{file.name}</p>
          ) : (
            <p>Drag & Drop or Select a file</p>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          accept="video/*"
          onChange={handleFileUpload}
          className="hidden"
          id="file-upload"
        />

        {/* Select File Button */}
        <Button
          variant="outline"
          className="mt-2"
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          Select File
        </Button>

        {/* Workflow Modal */}
        {file ? (
          <div className="mt-4">
            {currentUser ? (
              <WorkflowModal 
                triggerText="Transcode" 
                onSubmit={handleWorkflowSubmit} 
                selectedFile={file}
              />
            ) : (
              <div className="mt-4 text-center">
                <p className="mb-2">Log in to transcode this file</p>
                <Button variant="default" onClick={signInWithGoogle}>
                  Sign in with Google
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default FilePreview;