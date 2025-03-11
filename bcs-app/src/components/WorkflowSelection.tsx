import React from "react";
import { Box, Button, Typography } from "@mui/material";

const WorkflowSelection: React.FC = () => {
  return (
    <Box className="p-4 bg-white rounded-md shadow-md">
      <Typography variant="h6" gutterBottom>
        Workflow Selection
      </Typography>
      <Box className="flex flex-col gap-2">
        <Button variant="outlined" color="primary">
          Subtitle
        </Button>
        <Button variant="outlined" color="primary">
          Versioning
        </Button>
        <Button variant="outlined" color="primary">
          Transcoding
        </Button>
      </Box>
    </Box>
  );
};

export default WorkflowSelection;