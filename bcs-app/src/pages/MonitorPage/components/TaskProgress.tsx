import React from "react";
import { Progress } from "../../../ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "../../../ui/avatar";

interface TaskProgressProps {
  progress: number;
  onIncrease: () => void;
  onDecrease: () => void;
  username: string; // Name of the logged-in user
  userPhotoURL?: string; // Profile image URL of the logged-in user
}

const TaskProgress: React.FC<TaskProgressProps> = ({
  progress,
  onIncrease,
  onDecrease,
  username,
  userPhotoURL,
}) => {
  // Define checkpoints with labels
  const checkpoints = [
    { value: 0, label: "Start" },
    { value: 20, label: "Data Ingestion" },
    { value: 40, label: "Data Processing" },
    { value: 60, label: "Validation" },
    { value: 80, label: "Model Training"},
    { value: 100, label: "End" },
  ];

  return (
    <div>
      {/* User Info */}
      <div className="flex items-center gap-4 mb-4">
        <Avatar>
          <AvatarImage src={userPhotoURL} alt="Profile" />
          <AvatarFallback>{username.charAt(0)}</AvatarFallback>
        </Avatar>
        <h2 className="text-lg font-bold">{username}</h2>
      </div>

      {/* Task Title */}
      <h2 className="text-xl font-bold mb-2">Task: Data Processing</h2>

      {/* Progress Bar with Checkpoints */}
      <div className="relative mt-10 mb-6"> {/* Increased top margin for label space */}
        {/* Checkpoint Labels - Positioned ABOVE the markers */}
        <div className="absolute -top-8 left-0 w-full">
          {checkpoints.map((checkpoint) => (
            <div
              key={checkpoint.value}
              className="absolute text-center"
              style={{ 
                left: `${checkpoint.value}%`, 
                transform: "translateX(-50%)",
                width: "70px" // Fixed width to prevent overflow
              }}
            >
              {/* Label */}
              <p className="text-xs truncate" title={checkpoint.label}>{checkpoint.label}</p>
            </div>
          ))}
        </div>

        <Progress value={progress} className="h-2 bg-gray-700" />

        {/* Checkpoint Markers */}
        <div className="absolute top-0 left-0 w-full">
          {checkpoints.map((checkpoint) => (
            <div
              key={`marker-${checkpoint.value}`}
              className="absolute top-1"
              style={{ 
                left: `${checkpoint.value}%`, 
                transform: "translate(-50%, -50%)" 
              }}
            >
              {/* Small Circle Marker */}
              <div
                className={`w-3 h-3 rounded-full ${
                  progress >= checkpoint.value ? "bg-green-500" : "bg-gray-500"
                }`}
              ></div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Percentage */}
      <p className="text-sm mb-4">Progress: {progress}%</p>

      {/* Buttons */}
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