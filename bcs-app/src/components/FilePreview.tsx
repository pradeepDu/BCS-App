import React, { useState } from "react";
import { Paper, Button, Typography } from "@mui/material";

const FilePreview: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  return (
    <Paper elevation={3} className="p-4 mb-4">
      <Typography variant="h6" gutterBottom>
        File Preview
      </Typography>
      <div className="border-dashed border-2 border-gray-300 p-4 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-100">
        {file ? (
          <Typography>{file.name}</Typography>
        ) : (
          <Typography>Drag & Drop or Select a file</Typography>
        )}
      </div>
      <input
        type="file"
        onChange={handleFileUpload}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload">
        <Button
          variant="contained"
          color="primary"
          component="span"
          className="mt-2"
        >
          Select File
        </Button>
      </label>
    </Paper>
  );
};

export default FilePreview;