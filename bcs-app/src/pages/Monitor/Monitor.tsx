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
  onError: (errorMessage: string) => void;
}

const Monitor: React.FC<MonitorProps> = ({ file, onError }) => {
  const [stages, setStages] = useState<ProcessStage[]>([
    { name: 'Initializing', status: 'pending', progress: 0 },
    { name: 'Reading Video', status: 'pending', progress: 0 },
    { name: 'Processing Video', status: 'pending', progress: 0 },
    { name: 'Applying Transformations', status: 'pending', progress: 0 },
    { name: 'Finalizing', status: 'pending', progress: 0 }
  ]);
  const [currentStage, setCurrentStage] = useState(0);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Check connection status
  useEffect(() => {
    const checkConnection = () => {
      const now = new Date();
      const timeSinceLastUpdate = now.getTime() - lastUpdate.getTime();
      setIsConnected(timeSinceLastUpdate < 5000); // Consider disconnected if no updates for 5 seconds
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  const handleProgressUpdate = (event: ProgressUpdateEvent) => {
    setLastUpdate(new Date());
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

    // Handle error stage
    if (stage === -1) {
      onError(message);
    }
  };

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
    window.addEventListener('progressUpdate', handleProgressUpdate as EventListener);
    return () => window.removeEventListener('progressUpdate', handleProgressUpdate as EventListener);
  }, [onError]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Processing Monitor</h2>
        <div className={`px-3 py-1 rounded-full text-sm ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Inputs file={file} />
        <Processes stages={stages} currentStage={currentStage} />
        <Logs logs={logs} />
      </div>
      {!isConnected && (
        <div className="mt-4 p-4 bg-yellow-900 text-white rounded-lg">
          Connection lost. Attempting to reconnect...
        </div>
      )}
    </div>
  );
};

export default Monitor; 