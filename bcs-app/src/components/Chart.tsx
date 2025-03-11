import React from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const data = {
  labels: ["January", "February", "March", "April", "May", "June"],
  datasets: [
    {
      label: "Workflow Progress",
      data: [10, 20, 30, 40, 50, 60],
      borderColor: "rgba(75,192,192,1)",
      backgroundColor: "rgba(75,192,192,0.2)",
      fill: true,
    },
  ],
};

const ChartComponent: React.FC = () => {
  return (
    <div className="p-4 bg-white rounded-md shadow-md">
      <Line data={data} />
    </div>
  );
};

export default ChartComponent;