import React from "react";
import FilePreview from "../components/FilePreview";
import WorkflowSelection from "../components/WorkflowSelection";

const Home: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-8">
      <div className="col-span-1">
        <FilePreview />
      </div>
      <div className="col-span-1">
        <WorkflowSelection />
      </div>
    </div>
  );
};

export default Home;