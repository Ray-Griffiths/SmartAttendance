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
  studentIds?: string[];
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
// 🔐 JWT Helper
// ============================

function decodeJWT(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(atob(parts[1]));
    console.log("🔐 JWT Decoded:", decoded); // Debug
    return decoded;
  } catch (e) {
    console.error("❌ Failed to decode JWT:", e);
    return null;
  }
}

function getCurrentUserId(): string | null {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    console.warn("⚠️ No accessToken in localStorage");
    return null;
  }
  const decoded = decodeJWT(token);
  // JWT identity is stored in 'sub' claim (standard JWT claim)
  const userId = decoded?.sub || decoded?.user_id || decoded?.id || null;
  console.log("🔐 Extracted user ID:", userId);
  return userId;
}

// ============================
// 👥 User Management
// ============================

export const getUsers = () =>
  // Backend returns { users: [...], pagination: { ... } } — normalize to array
  safeRequest<any>(() => api.get("/api/admin/users")).then((d) => {
    if (Array.isArray(d)) return d as User[];
    if (d && Array.isArray(d.users)) return d.users as User[];
    return [] as User[];
  });

export const getUserById = (id: string) =>
  safeRequest<User>(() => api.get(`/api/admin/users/${id}`));

export const createUser = (payload: Omit<User, "id"> & { password?: string }) => {
  // ✅ Backend expects 'username' field, but frontend component sends 'name'
  // Transform 'name' to 'username' for backend compatibility
  const backendPayload = {
    ...payload,
    username: payload.name,
  };
  delete (backendPayload as any).name;
  
  console.log("📤 Creating user with payload:", backendPayload); // Debug
  
  return safeRequest<User>(() => api.post("/api/admin/users", backendPayload));
};

export const updateUser = (id: string, updates: Partial<User>) =>
  safeRequest<User>(() => api.put(`/api/admin/users/${id}`, updates));

export const deleteUser = (id: string) =>
  safeRequest<{ message: string }>(() => api.delete(`/api/admin/users/${id}`));

// ============================
// 🎓 Course Management
// ============================

export const getCourses = () =>
  // Backend returns { courses: [...], pagination: { ... } } — normalize to array
  safeRequest<any>(() => api.get("/api/admin/courses")).then((d) => {
    const raw = Array.isArray(d) ? d : (d && Array.isArray(d.courses) ? d.courses : []);
    // Normalize backend snake_case -> frontend camelCase for course objects
    return raw.map((c: any) => ({
      id: c.id || c._id || (c._id && c._id.$oid) || null,
      name: c.name,
      description: c.description,
      lecturerId: c.lecturer_id ?? c.lecturerId ?? null,
      studentIds: c.student_ids ?? c.studentIds ?? [],
      created_at: c.created_at ?? c.createdAt ?? null,
    })) as Course[];
  });

export const getCourseById = (id: string) =>
  safeRequest<any>(() => api.get(`/api/admin/courses/${id}`)).then((c) => {
    if (!c) return null as any;
    return {
      id: c.id || c._id || (c._id && c._id.$oid) || null,
      name: c.name,
      description: c.description,
      lecturerId: c.lecturer_id ?? c.lecturerId ?? null,
      studentIds: c.student_ids ?? c.studentIds ?? [],
      created_at: c.created_at ?? c.createdAt ?? null,
    } as Course;
  });

export const createCourse = (payload: Omit<Course, "id">) => {
  // ✅ Backend requires 'lecturer_id' field
  // For admin-created courses, use admin's ID as the lecturer_id
  const userId = getCurrentUserId();
  if (!userId) {
    console.error("❌ Cannot get current user ID from JWT - course creation will fail");
    throw new Error("Unable to determine current user ID. Please ensure you are logged in.");
  }
  
  const backendPayload = {
    ...payload,
    lecturer_id: userId,
  };
  
  console.log("📤 Creating course with payload:", backendPayload); // Debug
  // POST and normalize the returned course object (backend returns serialized course)
  return safeRequest<any>(() => api.post("/api/admin/courses", backendPayload)).then((res) => {
    if (!res) return null as any;
    // backend returns serialized course
    const c = res;
    return {
      id: c.id || c._id || null,
      name: c.name,
      description: c.description,
      lecturerId: c.lecturer_id ?? c.lecturerId ?? null,
      studentIds: c.student_ids ?? c.studentIds ?? [],
      created_at: c.created_at ?? c.createdAt ?? null,
    } as Course;
  });
};

export const updateCourse = (id: string, updates: Partial<Course>) =>
  // Normalize camelCase `lecturerId` -> snake_case `lecturer_id` for backend
  (() => {
    const payload: any = { ...updates } as any;
    if (payload.lecturerId !== undefined) {
      payload.lecturer_id = payload.lecturerId;
      delete payload.lecturerId;
    }
    return safeRequest<Course>(() => api.put(`/api/admin/courses/${id}`, payload));
  })();

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
  // Normalize backend responses which may return { logs: [...], pagination: {...} }
  safeRequest<any>(() => api.get("/api/admin/logs")).then((d) => {
    const raw = Array.isArray(d) ? d : d && Array.isArray(d.logs) ? d.logs : [];
    // Normalize each log entry for frontend consumption
    return (raw as any[]).map((l) => {
      const id = l.id || l._id || (l._id && l._id.$oid) || null;
      const user = l.user ?? l.user_name ?? l.user_id ?? (l.userObj && l.userObj.name) ?? "Unknown";
      const action = l.action ?? l.activity ?? l.message ?? "";
      const type = l.type ?? l.log_type ?? "System";
      // Prefer ISO date string; accept timestamp or created_at
      let dateVal = l.date ?? l.created_at ?? l.timestamp ?? l.time;
      if (typeof dateVal === "number") {
        dateVal = new Date(dateVal).toISOString();
      } else if (dateVal && !dateVal.endsWith && typeof dateVal === "string") {
        // leave as-is
      } else if (!dateVal) {
        dateVal = new Date().toISOString();
      }

      return {
        id,
        user,
        action,
        type,
        date: dateVal,
        userId: l.user_id ?? l.userId ?? undefined,
        timestamp: l.timestamp ?? undefined,
        details: l.details ?? l.meta ?? undefined,
      } as SystemLog;
    });
  });

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
export const getDashboardStats = () => {
  // Backend provides `/api/admin/dashboard` which returns { stats: { ... } }
  return safeRequest<any>(() => api.get("/api/admin/dashboard")).then((d) => {
    if (!d) return { totalStudents: 0, totalLecturers: 0, activeCourses: 0, totalSessions: 0 } as DashboardStats;
    // If backend wrapped the stats under `stats`, unwrap it
    const s = d.stats || d;
    return {
      totalStudents: s.total_students ?? s.totalStudents ?? 0,
      totalLecturers: s.total_lecturers ?? s.totalLecturers ?? 0,
      activeCourses: s.total_courses ?? s.activeCourses ?? s.totalCourses ?? 0,
      totalSessions: s.total_sessions ?? s.totalSessions ?? 0,
      averageAttendance: s.attendanceRate ?? s.averageAttendance ?? undefined,
      systemHealth: s.systemHealth ?? undefined,
    } as DashboardStats;
  });
};

// Fetch attendance summary (optionally by range: "week", "month", "semester")
export const getAttendanceSummary = (range?: string) =>
  safeRequest<AttendanceSummary[]>(() =>
    api.get(`/api/attendance/admin/summary${range ? `?range=${range}` : ""}`)
  );

// Fetch recent system logs with limit
export const getRecentLogs = (limit = 5) =>
  safeRequest<any>(() => api.get(`/api/admin/logs?limit=${limit}`)).then((d) => {
    const raw = Array.isArray(d) ? d : d && Array.isArray(d.logs) ? d.logs : [];
    return (raw as any[]).map((l) => {
      const id = l.id || l._id || (l._id && l._id.$oid) || null;
      const user = l.user ?? l.user_name ?? l.user_id ?? (l.userObj && l.userObj.name) ?? "Unknown";
      const action = l.action ?? l.activity ?? l.message ?? "";
      const type = l.type ?? l.log_type ?? "System";
      let dateVal = l.date ?? l.created_at ?? l.timestamp ?? l.time;
      if (typeof dateVal === "number") {
        dateVal = new Date(dateVal).toISOString();
      } else if (dateVal && !dateVal.endsWith && typeof dateVal === "string") {
        // leave as-is
      } else if (!dateVal) {
        dateVal = new Date().toISOString();
      }

      return {
        id,
        user,
        action,
        type,
        date: dateVal,
        userId: l.user_id ?? l.userId ?? undefined,
        timestamp: l.timestamp ?? undefined,
        details: l.details ?? l.meta ?? undefined,
      } as SystemLog;
    });
  });


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
