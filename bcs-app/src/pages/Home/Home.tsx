import React, { useState } from "react";
import FilePreview from "./components/FilePreview";
import WorkflowSelection from "./components/WorkflowSelection";

const Home: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-8">
      <div className="col-span-1">
        <FilePreview onFileSelect={setSelectedFile} />
      </div>
      <div className="col-span-1">
        {selectedFile && <WorkflowSelection />}
      </div>
    </div>
  );
};

export default Home;