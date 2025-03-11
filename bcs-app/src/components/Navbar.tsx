import React from "react";
import { AppBar, Toolbar, Typography, IconButton, Avatar } from "@mui/material";
import { FaHome, FaCog, FaFileAlt } from "react-icons/fa";

const Navbar: React.FC = () => {
  return (
    <AppBar position="static" color="primary">
      <Toolbar className="flex justify-between items-center">
        {/* Logo and Title */}
        <div className="flex items-center gap-2">
          <Avatar src="/logo.png" alt="Logo" />
          <Typography variant="h6" component="div">
            My Dashboard
          </Typography>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-4">
          <IconButton color="inherit">
            <FaHome size={20} />
          </IconButton>
          <IconButton color="inherit">
            <FaFileAlt size={20} />
          </IconButton>
          <IconButton color="inherit">
            <FaCog size={20} />
          </IconButton>
          <Avatar src="/user-avatar.png" alt="User Profile" />
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;