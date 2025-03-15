import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, logout } from "../Firebase/firebaseconfig";

const Navbar: React.FC = () => {
  const [user] = useAuthState(auth);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

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
            <AvatarFallback>BCS</AvatarFallback>
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
          {user ? (
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src={user.photoURL || "/default-avatar.png"} alt="User Profile" />
                <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span>{user.displayName}</span>
              <Button variant="destructive" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" asChild>
              <Link to="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Navbar;