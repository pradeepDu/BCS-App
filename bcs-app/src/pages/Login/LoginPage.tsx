import React from "react";
import { motion } from "framer-motion";
import { Button } from "../../ui/button"; // Shadcn Button
import { Avatar, AvatarImage, AvatarFallback } from "../../ui/avatar"; // Shadcn Avatar
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/card"; // Shadcn Card
import { signInWithGoogle, logout, auth } from "../../Firebase/firebaseconfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom"; // Import useNavigate

const LoginPage: React.FC = () => {
  const [user] = useAuthState(auth);
  const navigate = useNavigate(); // Initialize useNavigate

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      navigate("/"); // Redirect to the home page after successful login
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

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
      className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white"
    >
      <Card className="w-[400px] p-6 bg-gray-800 border-gray-700 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-white">Login</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {user ? (
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user.photoURL || "/default-avatar.png"} alt="Profile" />
                <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="text-lg">Welcome, {user.displayName}</p>
              <Button variant="destructive" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button variant="default" onClick={handleLogin}>
              Sign In with Google
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default LoginPage;