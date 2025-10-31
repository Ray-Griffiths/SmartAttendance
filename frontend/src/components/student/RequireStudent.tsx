import React from "react";
import { useAuth } from "@/context/AuthContext"; // ✅ Use absolute path
import { Navigate } from "react-router-dom";

interface RequireStudentProps {
  children: React.ReactElement;
}

/**
 * Protects routes that require a student role.
 * Redirects unauthenticated users to login,
 * and displays an unauthorized message for non-students.
 */
const RequireStudent: React.FC<RequireStudentProps> = ({ children }) => {
  const { user } = useAuth();

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Logged in but not a student → show unauthorized message
  if (user.role !== "student") {
    return (
      <div
        role="alert"
        className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-lg text-center mt-8 mx-auto max-w-md"
      >
        ❌ You are not authorized to view this page.
      </div>
    );
  }

  // Authorized student → render child component
  return children;
};

export default RequireStudent;
