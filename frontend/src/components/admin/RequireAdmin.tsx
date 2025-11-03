import React, { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

/**
 * Protects routes that require an admin role.
 * Waits for auth to load, redirects unauthenticated users to login,
 * and displays an unauthorized message for non-admins.
 */
const RequireAdmin: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();

  // Show toast once for unauthorized users
  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      toast.error("❌ You are not authorized to view this page");
    }
  }, [user, loading]);

  // Show loading indicator while auth context initializes
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground text-lg">Checking authentication...</p>
      </div>
    );
  }

  // Redirect unauthenticated users to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Display unauthorized message for non-admins
  if (user.role !== "admin") {
    return (
      <>
        <Toaster position="top-right" />
        <div
          role="alert"
          className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-lg text-center mt-8 mx-auto max-w-md"
        >
          ❌ You are not authorized to view this page.
        </div>
      </>
    );
  }

  // Authorized: render children
  return children;
};

export default RequireAdmin;
