import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";

const Navbar: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed top-0 w-full bg-black text-white p-4 z-50"
    >
      <div className="flex justify-between items-center">
        {/* Logo and Title */}
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src="/logo.png" alt="Logo" />
            <AvatarFallback>MD</AvatarFallback>
          </Avatar>
          <h1 className="text-lg font-bold">My Dashboard</h1>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Home</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/monitor">Monitor</Link>
          </Button>
          <Avatar>
            <AvatarImage src="/user-avatar.png" alt="User Profile" />
            <AvatarFallback>UP</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </motion.div>
  );
};

export default Navbar;