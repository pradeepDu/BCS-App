import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../ui/card";

interface Log {
  timestamp: Date;
  message: string;
  level: 'info' | 'warning' | 'error';
}

interface LogsProps {
  logs: Log[];
}

const Logs: React.FC<LogsProps> = ({ logs }) => {
  const getLogColor = (level: Log['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <Card className="p-4 h-full bg-gray-800 text-white">
      <CardHeader>
        <CardTitle>Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 h-[calc(100vh-200px)] overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="flex items-start space-x-2">
              <span className="text-gray-500 text-sm">
                {log.timestamp.toLocaleTimeString()}
              </span>
              <span className={`${getLogColor(log.level)} text-sm`}>
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Logs; 