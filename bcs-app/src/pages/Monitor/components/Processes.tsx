import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../ui/card";

interface ProcessStage {
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress: number;
}

interface ProcessesProps {
  stages: ProcessStage[];
  currentStage: number;
}

const Processes: React.FC<ProcessesProps> = ({ stages }) => {
  return (
    <Card className="bg-gray-800 text-white">
      <CardHeader>
        <CardTitle>Processing Stages</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage) => (
            <div key={stage.name} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{stage.name}</span>
                <span className="text-sm">{stage.progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-full rounded-full ${
                    stage.status === 'completed'
                      ? 'bg-green-500'
                      : stage.status === 'error'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${stage.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Processes; 