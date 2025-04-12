import React, { useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../ui/card";
import { Button } from "../../../ui/button";

interface FilePreviewProps {
  onFileSelect: (file: File) => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload via file input
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
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
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const droppedFile = event.dataTransfer.files[0];
      onFileSelect(droppedFile);
    }
  };

  return (
    <Card className="p-4 h-full bg-gray-800 text-white">
      <CardHeader>
        <CardTitle>File Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-dashed border-2 ${
            isDragging ? "border-blue-500" : "border-gray-600"
          } p-4 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-700 h-64`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <p>Drag & Drop or Select a file</p>
        </div>

        <input
          type="file"
          accept="video/*"
          onChange={handleFileUpload}
          className="hidden"
          ref={fileInputRef}
        />

        <Button
          variant="outline"
          className="mt-2 bg-white text-black hover:bg-gray-100"
          onClick={() => fileInputRef.current?.click()}
        >
          Select File
        </Button>
      </CardContent>
    </Card>
  );
};

export default FilePreview;