import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md">
      <div className="container mx-auto flex justify-between items-center p-4">
        {/* Left: Logo / App Name */}
        <Link to="/" className="text-2xl font-bold hover:text-gray-100">
          SmartAttendance
        </Link>

        {/* Middle: Links */}
        <div className="space-x-6 hidden md:flex">
          <Link to="/" className="hover:text-gray-200">Home</Link>
          {user?.role === "admin" && (
            <>
              <Link to="/admin" className="hover:text-gray-200">Dashboard</Link>
              <Link to="/admin/users" className="hover:text-gray-200">Users</Link>
              <Link to="/admin/logs" className="hover:text-gray-200">Logs</Link>
            </>
          )}

          {user?.role === "lecturer" && (
            <>
              <Link to="/lecturer/dashboard" className="hover:text-gray-200">Dashboard</Link>
              <Link to="/lecturer/students" className="hover:text-gray-200">Students</Link>
              <Link to="/lecturer/student-management" className="hover:text-gray-200">Student Mgmt</Link>
              <Link to="/lecturer/courses" className="hover:text-gray-200">Courses</Link>
              <Link to="/lecturer/attendances" className="hover:text-gray-200">Attendances</Link>
            </>
          )}

          {user?.role === "student" && (
            <>
              <Link to="/student" className="hover:text-gray-200">Dashboard</Link>
              <Link to="/student/attendance" className="hover:text-gray-200">My Attendance</Link>
            </>
          )}
        </div>

        {/* Right: User / Auth Buttons */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span className="font-medium">{user.name}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="px-3 py-1 bg-white text-blue-600 rounded hover:bg-gray-100 transition">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
