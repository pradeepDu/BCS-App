import React, { useState, useEffect } from "react";
import Inputs from "./components/Inputs";
import Processes from "./components/Processes";
import Logs from "./components/Logs";

interface ProcessStage {
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress: number;
}

interface Log {
  timestamp: Date;
  message: string;
  level: 'info' | 'warning' | 'error';
}

interface ProgressUpdateEvent extends Event {
  detail: {
    stage: number;
    progress: number;
    message: string;
  };
}

interface MonitorProps {
  file: File;
  onProcessingComplete: (processedFileUrl: string, fileName: string, format: string) => void;
}

const Monitor: React.FC<MonitorProps> = ({ file, onProcessingComplete }) => {
  const [stages, setStages] = useState<ProcessStage[]>([
    { name: 'Initializing', status: 'pending', progress: 0 },
    { name: 'Reading Video', status: 'pending', progress: 0 },
    { name: 'Processing Video', status: 'pending', progress: 0 },
    { name: 'Applying Transformations', status: 'pending', progress: 0 },
    { name: 'Finalizing', status: 'pending', progress: 0 }
  ]);
  const [currentStage, setCurrentStage] = useState(0);
  const [logs, setLogs] = useState<Log[]>([]);

  // Initialize monitoring
  useEffect(() => {
    // Add initial log
    setLogs([{
      timestamp: new Date(),
      message: `File selected: ${file.name}`,
      level: 'info'
    }]);
  }, [file]);

  // Listen for progress updates
  useEffect(() => {
    const handleProgressUpdate = (event: ProgressUpdateEvent) => {
      const { stage, progress, message } = event.detail;
      
      // Update stages
      setStages(prev => prev.map((s, index) => {
        if (index === stage) {
          return {
            ...s,
            status: stage === -1 ? 'error' : 'in-progress',
            progress: progress
          };
        } else if (index < stage) {
          return {
            ...s,
            status: 'completed',
            progress: 100
          };
        }
        return s;
      }));

      // Update current stage
      if (stage !== -1) {
        setCurrentStage(stage);
      }

      // Add log entry
      setLogs(prev => [...prev, {
        timestamp: new Date(),
        message: message,
        level: stage === -1 ? 'error' : 'info'
      }]);
    };

    window.addEventListener('progressUpdate', handleProgressUpdate as EventListener);
    return () => window.removeEventListener('progressUpdate', handleProgressUpdate as EventListener);
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-4">Processing Monitor</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Inputs file={file} />
        <Processes stages={stages} currentStage={currentStage} />
        <Logs logs={logs} />
      </div>
    </div>
  );
};

export default Monitor; 