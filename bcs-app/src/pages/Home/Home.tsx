import React, { useState, useEffect } from "react";
import FilePreview from "./components/FilePreview";
import WorkflowSelection from "./components/WorkflowSelection";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";

const Home: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedFileUrl, setProcessedFileUrl] = useState<string | null>(null);
  const [processedFileName, setProcessedFileName] = useState<string>("");
  const [processedFileFormat, setProcessedFileFormat] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Cleanup processed file URL when component unmounts or when new file is selected
  useEffect(() => {
    return () => {
      if (processedFileUrl) {
        URL.revokeObjectURL(processedFileUrl);
      }
    };
  }, [processedFileUrl]);

  const handleFileSelect = (file: File) => {
    // Cleanup previous processed file URL if exists
    if (processedFileUrl) {
      URL.revokeObjectURL(processedFileUrl);
    }
    setSelectedFile(file);
    setError(null);
  };

  const handleProcessingComplete = (url: string, fileName: string, format: string) => {
    setProcessedFileUrl(url);
    setProcessedFileName(fileName);
    setProcessedFileFormat(format);
    setError(null);
    setIsProcessing(false);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    if (processedFileUrl) {
      URL.revokeObjectURL(processedFileUrl);
      setProcessedFileUrl(null);
    }
    setIsProcessing(false);
  };

  const handleProcessingStart = () => {
    setIsProcessing(true);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FilePreview onFileSelect={handleFileSelect} />
        <WorkflowSelection 
          initialFile={selectedFile}
          onProcessingComplete={handleProcessingComplete}
          onError={handleError}
          onProcessingStart={handleProcessingStart}
          isDisabled={!selectedFile}
        />
      </div>
      {error && (
        <div className="mt-4 p-4 bg-red-900 text-white rounded-lg">
          <span>{error}</span>
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
                  className="block w-full"
                >
                  <Button className="w-full bg-white text-black hover:bg-gray-100">
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