import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../ui/card";

interface InputsProps {
  file: File;
}

const Inputs: React.FC<InputsProps> = ({ file }) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="p-4 h-full bg-gray-800 text-white">
      <CardHeader>
        <CardTitle>Inputs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-400">File Name</h3>
            <p className="text-white">{file.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-400">File Size</h3>
            <p className="text-white">{formatFileSize(file.size)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-400">File Type</h3>
            <p className="text-white">{file.type}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-400">Last Modified</h3>
            <p className="text-white">{new Date(file.lastModified).toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Inputs; 