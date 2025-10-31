import React, { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface RequireLecturerProps {
  children?: ReactNode;
}

/**
 * Route guard for lecturer-only pages.
 * - Waits for session restoration
 * - Redirects unauthorized users clearly
 */
const RequireLecturer: React.FC<RequireLecturerProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // While restoring / logging in
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 mr-3"></div>
        Checking authentication...
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but not lecturer
  if (user.role?.toLowerCase() !== "lecturer") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 text-red-700">
        <div className="bg-white shadow-md rounded-xl p-8 border border-red-200 max-w-md text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="mb-4">❌ You are not authorized to view this page.</p>
          <a
            href="/"
            className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  // Authorized: render nested routes or passed children
  return <>{children ?? <Outlet />}</>;
};

export default RequireLecturer;
