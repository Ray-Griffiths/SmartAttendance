import api from "./api"; // ✅ Use the shared axios instance
import type { AxiosError } from "axios";

// ============================
// ⚙️ Safe Request Helper
// ============================

async function safeRequest<T>(fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await fn();
    return data;
  } catch (error: any) {
    const err = error as AxiosError;
    console.error("❌ Lecturer API Error:", err.response?.data || err.message);
    throw err.response?.data || err;
  }
}

// ============================
// 🧩 Type Definitions
// ============================

export interface CourseSummary {
  id: string;
  name: string;
  code?: string;
  description?: string;
  lecturerId?: string;
  studentIds?: string[];
  created_at?: string;
}

export interface SessionSummary {
  id: string;
  courseId: string;
  session_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_active?: boolean;
  qr_code_uuid?: string | null;
  qr_code_base64?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  location_required?: boolean;
  location?: { lat: number; lng: number } | null;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName?: string;
  studentRegNo?: string;
  timestamp: string;
}

export interface AnalyticsResponse {
  totalSessions: number;
  totalStudents: number;
  avgAttendance: number;
  dateRange?: { from?: string; to?: string };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

// ============================
// 🎓 Lecturer API Endpoints
// ============================

// ✅ Fixed: Added /api prefix to all routes
export const getCourses = () =>
  safeRequest<CourseSummary[]>(() => api.get("/api/lecturer/courses"));

export const createCourse = (payload: {
  code?: string;
  name: string;
  description?: string;
}) =>
  safeRequest<CourseSummary>(() => api.post("/api/lecturer/courses", payload));

export const getSessions = async (courseId?: string) => {
  if (courseId) {
    return safeRequest<SessionSummary[]>(() =>
      api.get(`/api/lecturer/courses/${courseId}/sessions`)
    );
  }

  const courses = await getCourses();
  const allSessions: SessionSummary[] = [];

  await Promise.all(
    courses.map(async (course) => {
      try {
        const sessions = await safeRequest<SessionSummary[]>(() =>
          api.get(`/api/lecturer/courses/${course.id}/sessions`)
        );
        sessions.forEach((s) => {
          if (!s.courseId) s.courseId = course.id;
        });
        allSessions.push(...sessions);
      } catch (err) {
        console.warn(`⚠️ Failed to fetch sessions for ${course.name}:`, err);
      }
    })
  );

  return allSessions;
};

export const getSessionsByCourse = (courseId: string) =>
  safeRequest<SessionSummary[]>(() =>
    api.get(`/api/lecturer/courses/${courseId}/sessions`)
  );

export const createSession = (payload: {
  courseId: string;
  session_date?: string;
  start_time?: string;
  end_time?: string;
  qr_expires_in_minutes?: number;
  location?: { lat: number; lng: number } | null;
}) => {
  const { courseId, ...body } = payload;
  return safeRequest<SessionSummary>(() =>
    api.post(`/api/lecturer/courses/${courseId}/sessions`, body)
  );
};

export const createSessionByCourse = (courseId: string, startTime: string) =>
  safeRequest<SessionSummary>(() =>
    api.post(`/api/lecturer/courses/${courseId}/sessions`, { startTime })
  );

export const startSession = (sessionId: string, courseId?: string) => {
  const endpoint = courseId
    ? `/api/lecturer/courses/${courseId}/sessions/${sessionId}/start`
    : `/api/lecturer/sessions/${sessionId}/start`;

  return safeRequest<SessionSummary>(() => api.post(endpoint));
};

export const closeSession = (sessionId: string) =>
  safeRequest<SessionSummary>(() =>
    api.post(`/api/lecturer/sessions/${sessionId}/close`)
  );

export const getAttendanceBySession = (sessionId: string) =>
  safeRequest<AttendanceRecord[]>(() =>
    api.get(`/api/lecturer/sessions/${sessionId}/attendance`)
  );

export const postAttendance = (
  sessionId: string,
  payload: { studentId: string; method?: string }
) =>
  safeRequest<AttendanceRecord>(() =>
    api.post(`/api/lecturer/sessions/${sessionId}/attendance`, payload)
  );

export const markAttendance = (sessionId: string, data: any) =>
  safeRequest<AttendanceRecord>(() =>
    api.post(`/api/lecturer/sessions/${sessionId}/attendance`, data)
  );

export const markManualAttendance = (sessionId: string, studentId: string) =>
  safeRequest<AttendanceRecord>(() =>
    api.post(`/api/lecturer/sessions/${sessionId}/attendance/manual`, { studentId })
  );

export const getCourseAnalytics = (courseId: string, from?: string, to?: string) => {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;

  return safeRequest<AnalyticsResponse>(() =>
    api.get(`/api/lecturer/courses/${courseId}/analytics`, { params })
  );
};

// ============================
// 👥 Student Management
// ============================

export const getStudentsByCourse = (courseId: string) =>
  safeRequest<any[]>(() =>
    api.get(`/api/lecturer/courses/${courseId}/students`)
  );

export const getCourseStudents = async (courseId: string) => {
  const res = await api.get(`/api/lecturer/courses/${courseId}/students`);
  return res.data;
};

export const addStudentToCourse = async (courseId: string, indexNumber: string) => {
  const res = await api.post(`/api/lecturer/courses/${courseId}/students`, { indexNumber });
  return res.data.student;
};

export const importStudentsCsv = async (courseId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/api/lecturer/courses/${courseId}/students/import`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const previewImportStudents = async (courseId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/api/lecturer/courses/${courseId}/students/import/preview`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getImportJob = async (jobId: string) => {
  const res = await api.get(`/api/imports/${jobId}`);
  return res.data;
};

export const exportStudents = async (courseId: string) => {
  const res = await api.get(`/api/lecturer/courses/${courseId}/students/export`, { responseType: 'blob' });
  return res.data;
};

// ============================
// 🧩 Auth Token Helper
// ============================

export const setAuthToken = (token: string | null): void => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};