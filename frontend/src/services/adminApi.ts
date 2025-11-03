// frontend/src/services/adminApi.ts
import api, { setAuthToken } from "./api"; // ✅ Shared axios instance
import type { AxiosResponse } from "axios";

// ============================
// 📦 Interfaces
// ============================

export interface User {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Lecturer" | "Student";
  created_at?: string;
}

export interface Course {
  id: string;
  name: string;
  code?: string;
  lecturerId?: string;
  description?: string;
  created_at?: string;
}

export interface SystemLog {
  id: string;
  user?: string; // updated for front-end display
  action: string;
  type: "User Management" | "Attendance" | "System";
  date: string;
  userId?: string;
  timestamp?: string;
  details?: string;
}

export interface AnalyticsData {
  totalUsers: number;
  totalCourses: number;
  totalLecturers: number;
  totalStudents: number;
  attendanceRate?: number;
  totalSessions?: number;
  lastUpdated?: string;
}

// ============================
// 🛠️ Helper for Safe Requests
// ============================

async function safeRequest<T>(fn: () => Promise<AxiosResponse<T>>): Promise<T> {
  try {
    // ✅ Always refresh Authorization token before any API call
    const token = localStorage.getItem("accessToken");
    if (token) {
      setAuthToken(token);
    } else {
      console.warn("⚠️ No accessToken found before request – user may not be logged in");
    }

    const { data } = await fn();
    return data;
  } catch (error: any) {
    console.error("❌ Admin API Error:", {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
      url: error?.config?.url,
    });
    throw error.response?.data || error;
  }
}

// ============================
// 👥 User Management
// ============================

export const getUsers = () =>
  safeRequest<User[]>(() => api.get("/api/admin/users"));

export const getUserById = (id: string) =>
  safeRequest<User>(() => api.get(`/api/admin/users/${id}`));

export const createUser = (payload: Omit<User, "id"> & { password?: string }) =>
  safeRequest<User>(() => api.post("/api/admin/users", payload));

export const updateUser = (id: string, updates: Partial<User>) =>
  safeRequest<User>(() => api.put(`/api/admin/users/${id}`, updates));

export const deleteUser = (id: string) =>
  safeRequest<{ message: string }>(() => api.delete(`/api/admin/users/${id}`));

// ============================
// 🎓 Course Management
// ============================

export const getCourses = () =>
  safeRequest<Course[]>(() => api.get("/api/admin/courses"));

export const getCourseById = (id: string) =>
  safeRequest<Course>(() => api.get(`/api/admin/courses/${id}`));

export const createCourse = (payload: Omit<Course, "id">) =>
  safeRequest<Course>(() => api.post("/api/admin/courses", payload));

export const updateCourse = (id: string, updates: Partial<Course>) =>
  safeRequest<Course>(() => api.put(`/api/admin/courses/${id}`, updates));

export const deleteCourse = (id: string) =>
  safeRequest<{ message: string }>(() => api.delete(`/api/admin/courses/${id}`));

// ============================
// 📊 System Analytics
// ============================

export const getAnalytics = () =>
  safeRequest<AnalyticsData>(() => api.get("/api/admin/analytics"));

export const getCourseAnalytics = (courseId: string) =>
  safeRequest<{ totalSessions: number; avgAttendance: number; totalStudents: number }>(
    () => api.get(`/api/admin/courses/${courseId}/analytics`)
  );

// ============================
// 🕒 System Logs
// ============================

export const getSystemLogs = () =>
  safeRequest<SystemLog[]>(() => api.get("/api/admin/logs")); // <-- used by SystemLogs.tsx

export const clearSystemLogs = () =>
  safeRequest<{ message: string }>(() => api.delete("/api/admin/logs/clear"));

// ============================
// 🔍 Search & Filtering
// ============================

export const searchUsers = (query: string) =>
  safeRequest<User[]>(() =>
    api.get(`/api/admin/users/search?q=${encodeURIComponent(query)}`)
  );

export const filterUsersByDateRange = (from: string, to: string) =>
  safeRequest<User[]>(() =>
    api.get(`/api/admin/users/filter?from=${from}&to=${to}`)
  );

// ============================
// 📝 Additional Admin APIs for Dashboard & Attendance
// ============================

export interface AttendanceSummary {
  courseId: string;
  courseTitle: string;
  studentsPresent: number;
  studentsAbsent: number;
  attendanceRate?: number;
}

export interface DashboardStats {
  totalStudents: number;
  totalLecturers: number;
  activeCourses: number;
  totalSessions: number;
}

// Fetch overall dashboard stats
export const getDashboardStats = () =>
  safeRequest<DashboardStats>(() => api.get("/api/admin/stats"));

// Fetch attendance summary (optionally by range: "week", "month", "semester")
export const getAttendanceSummary = (range?: string) =>
  safeRequest<AttendanceSummary[]>(() =>
    api.get(`/api/attendance/admin/summary${range ? `?range=${range}` : ""}`)
  );

// Fetch recent system logs with limit
export const getRecentLogs = (limit = 5) =>
  safeRequest<SystemLog[]>(() => api.get(`/api/admin/logs?limit=${limit}`));


// ============================
// ✅ Connection Test Utility (Optional)
// ============================

export const testAdminConnection = async () => {
  console.log("🧩 Testing Admin API connection...");
  try {
    const response = await api.get("/api/admin/ping");
    console.log("✅ Admin API Connected:", response.data);
  } catch (err) {
    console.error("🚨 Admin API Connection Failed:", err);
  }
};
