// src/routes.tsx
import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "../pages/Home";
import Monitor from "../pages/MonitorPage";
import LoginPage from "../pages/LoginPage";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/monitor" element={<Monitor />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
};

export default AppRoutes;