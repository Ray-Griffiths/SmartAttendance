import api from "./api"; // ✅ Use the shared axios instance from api.ts
import type { AxiosError } from "axios";

// ============================
// 🧩 Type Definitions
// ============================

export interface AttendancePayload {
  studentId: string;
  method: string;
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: string;
}

export interface AttendanceResponse {
  id: string;
  sessionId: string;
  studentId: string;
  timestamp: string;
  status?: string;
  method?: string;
}

export interface StudentSession {
  id: string;
  courseId: string;
  courseName?: string;
  session_date?: string;
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
  lecturerName?: string;
  location_required?: boolean;
}

export interface StudentCourse {
  id: string;
  name: string;
  code?: string;
  description?: string;
  lecturerId?: string;
  created_at?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  email?: string; // Optional email field for profile updates
}

export interface SystemLog {
  id: number;
  user: string;
  action: string;
  type: "User Management" | "Attendance" | "System";
  date: string;
}

export interface PaginatedLogsResponse {
  logs: SystemLog[];
  total: number;
  currentPage: number;
  totalPages: number;
}

// ============================
// ⚙️ Safe Request Helper
// ============================

async function safeRequest<T>(fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await fn();
    return data;
  } catch (error: any) {
    const err = error as AxiosError;
    console.error("❌ Student API Error:", err.response?.data || err.message);
    throw err.response?.data || err;
  }
}

// ============================
// 🎓 Student API Endpoints
// ============================

/** ✅ Fetch all courses for the logged-in student */
export const getStudentCourses = () =>
  safeRequest<StudentCourse[]>(() => api.get("/student/courses"));

/** ✅ Fetch upcoming or past sessions for a course or all courses */
export const getStudentSessions = (courseId?: string) => {
  const endpoint = courseId
    ? `/student/courses/${courseId}/sessions`
    : `/student/sessions`;
  return safeRequest<StudentSession[]>(() => api.get(endpoint));
};

/** ✅ Submit attendance for a session */
export const postAttendance = (
  sessionId: string,
  payload: AttendancePayload
) =>
  safeRequest<AttendanceResponse>(() =>
    api.post(`/student/attendance/${sessionId}`, payload)
  );

/** ✅ Fetch current student profile */
export const getStudentProfile = () =>
  safeRequest<StudentProfile>(() => api.get("/student/profile"));

/** ✅ Update student profile */
export const updateStudentProfile = (data: Partial<StudentProfile>) =>
  safeRequest<StudentProfile>(() => api.put("/student/profile", data));

// ============================
// 🧾 System Logs (Optional: for dashboard analytics)
// ============================

export const fetchSystemLogs = (
  page = 1,
  pageSize = 10,
  filter = "all",
  search = "",
  fromDate?: string,
  toDate?: string
) =>
  safeRequest<PaginatedLogsResponse>(() => {
    const params: Record<string, string | number> = {
      page,
      pageSize,
      filter,
      search,
    };
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;

    return api.get("/logs", { params });
  });
