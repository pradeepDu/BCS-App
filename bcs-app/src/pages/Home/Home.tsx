import React, { useState } from "react";
import FilePreview from "./components/FilePreview";
import WorkflowSelection from "./components/WorkflowSelection";
import Monitor from "../Monitor/Monitor";
import { Button } from "../../ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";

const Home: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedFileUrl, setProcessedFileUrl] = useState<string | null>(null);
  const [processedFileName, setProcessedFileName] = useState<string>("");
  const [processedFileFormat, setProcessedFileFormat] = useState<string>("");

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleProcessingComplete = (url: string, fileName: string, format: string) => {
    setProcessedFileUrl(url);
    setProcessedFileName(fileName);
    setProcessedFileFormat(format);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FilePreview onFileSelect={handleFileSelect} />
        {selectedFile && (
          <WorkflowSelection 
            initialFile={selectedFile}
            onProcessingComplete={handleProcessingComplete}
          />
        )}
      </div>
      {selectedFile && (
        <div className="mt-8">
          <Monitor 
            file={selectedFile}
            onProcessingComplete={handleProcessingComplete}
          />
        </div>
      )}
      {processedFileUrl && (
        <div className="mt-8">
          <Card className="bg-gray-800 text-white">
            <CardHeader>
              <CardTitle>Processed Video Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video w-full max-w-3xl mx-auto">
                <video 
                  controls 
                  className="w-full h-full rounded-lg"
                  src={processedFileUrl}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="flex justify-center">
                <a 
                  href={processedFileUrl} 
                  download={`${processedFileName}.${processedFileFormat}`}
                  className="block"
                >
                  <Button variant="default" className="w-full bg-white text-black hover:bg-gray-100">
                    Download Processed Video
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Home;