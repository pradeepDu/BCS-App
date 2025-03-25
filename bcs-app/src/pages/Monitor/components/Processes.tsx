import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../ui/card";
import { Progress } from "../../../ui/progress";

interface ProcessStage {
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress: number;
}

interface ProcessesProps {
  stages: ProcessStage[];
  currentStage: number;
}

const Processes: React.FC<ProcessesProps> = ({ stages, currentStage }) => {
  const getStatusColor = (status: ProcessStage['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="p-4 h-full bg-gray-800 text-white">
      <CardHeader>
        <CardTitle>Processes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div key={stage.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(stage.status)}`} />
                  <span className="text-sm font-medium">{stage.name}</span>
                </div>
                <span className="text-sm text-gray-400">{stage.progress}%</span>
              </div>
              <Progress value={stage.progress} className="h-1" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Processes; 