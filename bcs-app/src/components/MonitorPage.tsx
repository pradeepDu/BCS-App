import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Button } from "../components/ui/button";

const MonitorPage: React.FC = () => {
  const [progress, setProgress] = useState(50);

  const handleIncrease = () => {
    setProgress((prevProgress) => Math.min(prevProgress + 10, 100));
  };

  const handleDecrease = () => {
    setProgress((prevProgress) => Math.max(prevProgress - 10, 0));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <Card className="p-4 bg-gray-800 text-white">
        <CardHeader>
          <CardTitle>Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="mb-4 h-2 bg-gray-700" />
          <p className="text-sm mb-4">Progress: {progress}%</p>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleDecrease}>
              -
            </Button>
            <Button variant="default" onClick={handleIncrease}>
              +
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MonitorPage;