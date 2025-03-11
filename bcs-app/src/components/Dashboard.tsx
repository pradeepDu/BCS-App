import React from "react";
import { Grid } from "@mui/material";
import FilePreview from "./FilePreview";
import WorkflowSelection from "./WorkflowSelection";

const Dashboard: React.FC = () => {
  return (
    <Grid container spacing={4} className="p-4">
      {/* Left Section */}
      <Grid item xs={12} md={8}>
        <FilePreview />
      </Grid>

      {/* Right Section */}
      <Grid item xs={12} md={4}>
        <WorkflowSelection />
      </Grid>
    </Grid>
  );
};

export default Dashboard;