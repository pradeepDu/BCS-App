import React from "react";
import { Progress } from "../../../ui/progress";

interface TaskProgressProps {
  progress: number;
  onIncrease: () => void;
  onDecrease: () => void;
}

const TaskProgress: React.FC<TaskProgressProps> = ({
  progress,
  onIncrease,
  onDecrease,
}) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Task: Data Processing</h2>
      <Progress value={progress} className="mb-4 h-2 bg-gray-700" />
      <p className="text-sm mb-4">Progress: {progress}%</p>
      <div className="flex gap-2">
        <button
          className="px-4 py-2 bg-red-500 text-white rounded"
          onClick={onDecrease}
        >
          Decrease
        </button>
        <button
          className="px-4 py-2 bg-green-500 text-white rounded"
          onClick={onIncrease}
        >
          Increase
        </button>
      </div>
    </div>
  );
};

export default TaskProgress;