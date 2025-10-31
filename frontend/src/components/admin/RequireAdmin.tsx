import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

/**
 * Protects routes that require an admin role.
 * Redirects unauthenticated users to login,
 * and displays an unauthorized message for non-admins.
 */
const RequireAdmin: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('❌ You are not authorized to view this page');
    }
  }, [user]);

  if (!user) {
    // Not logged in
    return <Navigate to="/auth/login" replace />;
  }

  if (user.role !== 'admin') {
    // Unauthorized
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

  return children;
};

export default RequireAdmin;
