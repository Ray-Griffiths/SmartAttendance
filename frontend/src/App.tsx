import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

// ============================
// Components & Layouts
// ============================
import Navbar from "@/components/Navbar";
import RequireAdmin from "@/components/admin/RequireAdmin";
import RequireLecturer from "@/components/lecturer/RequireLecturer";
import RequireStudent from "@/components/student/RequireStudent";

// ============================
// Pages
// ============================
import HomePage from "./pages/HomePage";

import LecturerDashboard from "./components/lecturer/LecturerDashboard";
import CourseList from "./components/lecturer/CourseList";
import AttendanceList from "./components/lecturer/AttendanceList";
import StudentsList from "./components/lecturer/StudentList";
import StudentManagementPage from "./components/lecturer/StudentManagementPage";

import AdminDashboard from "./components/admin/AdminDashboard";
import ManageUsers from "./components/admin/ManageUsers";
import SystemLogs from "./components/admin/SystemLogs";

import StudentDashboard from "./components/student/StudentDashboard";
import MyAttendance from "./components/student/MyAttendance";

import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";

// ============================
// Main App Component
// ============================
const App: React.FC = () => {
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();

  // Check if token exists before rendering routes
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      console.log("✅ Token detected in App.tsx:", token);
    } else {
      console.warn("⚠️ No access token found in App.tsx");
    }
    setAuthChecked(true);
  }, [location]);

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Global Navbar */}
      <Navbar />

      {/* Page Content */}
      <main className="flex-grow">
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<HomePage />} />

          {/* Authentication */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* ============================ */}
          {/* Admin Protected Routes */}
          {/* ============================ */}
          <Route
            path="/admin/*"
            element={
              <RequireAdmin>
                <Outlet />
              </RequireAdmin>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="logs" element={<SystemLogs />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* ============================ */}
          {/* Lecturer Protected Routes */}
          {/* ============================ */}
          <Route
            path="/lecturer/*"
            element={
              <RequireLecturer>
                <Outlet />
              </RequireLecturer>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<LecturerDashboard />} />
            <Route path="students" element={<StudentsList />} />
            <Route path="student-management" element={<StudentManagementPage />} />
            <Route path="courses" element={<CourseList />} />
            <Route path="attendances" element={<AttendanceList />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* ============================ */}
          {/* Student Protected Routes */}
          {/* ============================ */}
          <Route
            path="/student/*"
            element={
              <RequireStudent>
                <Outlet />
              </RequireStudent>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="attendance" element={<MyAttendance />} />
            <Route path="*" element={<Navigate to="attendance" replace />} />
          </Route>

          {/* ============================ */}
          {/* 404 Page */}
          {/* ============================ */}
          <Route
            path="*"
            element={
              <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <h1 className="text-4xl font-bold text-destructive">404</h1>
                <p className="text-lg text-muted-foreground">Page not found</p>
                <button
                  onClick={() => window.location.replace("/")}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition"
                >
                  Go Home
                </button>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;
