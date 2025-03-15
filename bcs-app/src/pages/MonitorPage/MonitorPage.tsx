import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "../../ui/card";
import TaskProgress from "../MonitorPage/components/TaskProgress";
import InputButton from "../MonitorPage/components/InputButton";
import OutputButton from "../MonitorPage/components/OutputButton";

const MonitorPage: React.FC = () => {
  const [progress, setProgress] = useState(50);
  const [outputData, setOutputData] = useState<string | null>(null);

  const handleIncrease = () => {
    setProgress((prevProgress) => Math.min(prevProgress + 10, 100));
  };

  const handleDecrease = () => {
    setProgress((prevProgress) => Math.max(prevProgress - 10, 0));
  };

  const handleOutput = () => {
    // Simulate output data based on progress
    setOutputData(`Output generated at ${progress}% progress`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <Card className="p-4 bg-gray-800 text-white">
        <TaskProgress
          progress={progress}
          onIncrease={handleIncrease}
          onDecrease={handleDecrease}
        />
        <div className="flex gap-4 mt-4">
          <InputButton />
          <OutputButton onClick={handleOutput} />
        </div>
        {outputData && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold">Output:</h3>
            <p>{outputData}</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default MonitorPage;