import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import WorkflowModal from "./WorkflowModal.tsx";

const WorkflowSelection: React.FC = () => {
  return (
    <Card className="p-4 h-full bg-gray-800 text-white">
      <CardHeader>
        <CardTitle>Workflow Selection</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <WorkflowModal triggerText="Subtitle" />
        <WorkflowModal triggerText="Versioning" />
        <WorkflowModal triggerText="Transcoding" />
      </CardContent>
    </Card>
  );
};

export default WorkflowSelection;