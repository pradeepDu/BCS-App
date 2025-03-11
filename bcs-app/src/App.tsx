import React from "react";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import ChartComponent from "./components/chart";

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow flex flex-col p-4">
        <Dashboard />
        <ChartComponent />
      </main>
    </div>
  );
};

export default App;