import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";

const FilePreview: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  return (
    <Card className="p-4 h-full bg-gray-800 text-white">
      <CardHeader>
        <CardTitle>File Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="border-dashed border-2 border-gray-600 p-4 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-700 h-64"
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          {file ? (
            <p>{file.name}</p>
          ) : (
            <p>Drag & Drop or Select a file</p>
          )}
        </div>
        <input
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          id="file-upload"
        />
        <Button
          variant="outline"
          className="mt-2"
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          Select File
        </Button>
      </CardContent>
    </Card>
  );
};

export default FilePreview;