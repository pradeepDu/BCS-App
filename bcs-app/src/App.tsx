// src/App.tsx
import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import Navbar from "./components/Navbar";
import AppRoutes from "../src/Routes/routes";

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main className="pt-20">
          <AppRoutes />
        </main>
      </div>
    </Router>
  );
};

export default App;