import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "../../ui/card";
import TaskProgress from "../MonitorPage/components/TaskProgress";
import InputButton from "../MonitorPage/components/InputButton";
import OutputButton from "../MonitorPage/components/OutputButton";
import { auth } from "../../Firebase/firebaseconfig";

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

  // Get the logged-in user's details
  const user = auth.currentUser;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="max-w-3xl mx-auto my-8"
    >
      <Card className="p-6 bg-gray-800 text-white shadow-lg rounded-lg">
        {user ? (
          <div className="space-y-8">
            <div className="border-b border-gray-700 pb-6">
              <TaskProgress
                progress={progress}
                onIncrease={handleIncrease}
                onDecrease={handleDecrease}
                username={user.displayName || "User"}
                userPhotoURL={user.photoURL || undefined}
              />
            </div>
            
            <div className="pt-2">
              <h3 className="text-lg font-semibold mb-4">Actions</h3>
              <div className="flex flex-wrap gap-4">
                <InputButton />
                <OutputButton onClick={handleOutput} />
              </div>
            </div>
            
            {outputData && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-lg font-semibold mb-3">Output:</h3>
                <div className="bg-gray-900 p-4 rounded-md">
                  <p>{outputData}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-lg">Please log in to view your progress.</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default MonitorPage;