import api from "./api"; // ✅ Use the shared axios instance from api.ts
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

// ============================
// 🎓 Lecturer API Endpoints
// ============================

export const getCourses = () =>
  safeRequest<CourseSummary[]>(() => api.get("/lecturer/courses"));

export const createCourse = (payload: {
  code: string;
  name: string;
  description?: string;
}) =>
  safeRequest<CourseSummary>(() => api.post("/lecturer/courses", payload));

export const getSessions = async (courseId?: string) => {
  if (courseId) {
    return safeRequest<SessionSummary[]>(() =>
      api.get(`/lecturer/courses/${courseId}/sessions`)
    );
  }

  const courses = await getCourses();
  const allSessions: SessionSummary[] = [];

  await Promise.all(
    courses.map(async (course) => {
      try {
        const sessions = await safeRequest<SessionSummary[]>(() =>
          api.get(`/lecturer/courses/${course.id}/sessions`)
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
    api.post(`/lecturer/courses/${courseId}/sessions`, body)
  );
};

export const startSession = (sessionId: string, courseId?: string) => {
  const endpoint = courseId
    ? `/lecturer/courses/${courseId}/sessions/${sessionId}/start`
    : `/lecturer/sessions/${sessionId}/start`;

  return safeRequest<SessionSummary>(() => api.post(endpoint));
};

export const getAttendanceBySession = (sessionId: string) =>
  safeRequest<AttendanceRecord[]>(() =>
    api.get(`/lecturer/sessions/${sessionId}/attendance`)
  );

export const postAttendance = (
  sessionId: string,
  payload: { studentId: string; method?: string }
) =>
  safeRequest<AttendanceRecord>(() =>
    api.post(`/lecturer/sessions/${sessionId}/attendance`, payload)
  );

export const getCourseAnalytics = (courseId: string, from?: string, to?: string) => {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;

  return safeRequest<AnalyticsResponse>(() =>
    api.get(`/lecturer/courses/${courseId}/analytics`, { params })
  );
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

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export const markAttendance = (sessionId: string, data: any) =>
  safeRequest<AttendanceRecord>(() =>
    api.post(`/lecturer/sessions/${sessionId}/attendance`, data)
  );

// ============================
// 🆕 New Functions Added
// ============================

/** ✅ Get all sessions for a specific course */
export const getSessionsByCourse = (courseId: string) =>
  safeRequest<SessionSummary[]>(() =>
    api.get(`/lecturer/courses/${courseId}/sessions`)
  );

/** ✅ Get all students enrolled in a course */
export const getStudentsByCourse = (courseId: string) =>
  safeRequest<any[]>(() =>
    api.get(`/lecturer/courses/${courseId}/students`)
  );

/** ✅ Create a new session for a course (simplified call) */
export const createSessionByCourse = (courseId: string, startTime: string) =>
  safeRequest<SessionSummary>(() =>
    api.post(`/lecturer/courses/${courseId}/sessions`, { startTime })
  );

/** ✅ Close an active session */
export const closeSession = (sessionId: string) =>
  safeRequest<SessionSummary>(() =>
    api.post(`/lecturer/sessions/${sessionId}/close`)
  );

/** ✅ Mark attendance manually */
export const markManualAttendance = (sessionId: string, studentId: string) =>
  safeRequest<AttendanceRecord>(() =>
    api.post(`/lecturer/sessions/${sessionId}/attendance/manual`, { studentId })
  );


export const getCourseStudents = async (courseId: string) => {
  const res = await api.get(`/lecturer/courses/${courseId}/students`);
  return res.data;
};

export const addStudentToCourse = async (courseId: string, indexNumber: string) => {
  const res = await api.post(`/lecturer/courses/${courseId}/students`, { indexNumber });
  return res.data;
};

export const importStudentsCsv = async (courseId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/lecturer/courses/${courseId}/students/import`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
