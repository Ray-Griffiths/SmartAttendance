// frontend/src/services/authApi.ts
import api, { setAuthToken } from "./api";

// ============================
// 🧠 Interfaces
// ============================

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "lecturer" | "student";
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: "lecturer" | "student"; // Admins can assign roles separately
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

// ============================
// ⚙️ Utility: Safe Request Wrapper
// ============================

async function safeRequest<T>(fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await fn();
    return data;
  } catch (error: any) {
    const errMsg =
      error?.response?.data?.message ||
      error?.message ||
      "An unexpected authentication error occurred.";
    console.error("❌ Auth API Error:", errMsg);
    throw new Error(errMsg);
  }
}

// ============================
// 🚪 Authentication
// ============================

// 🔹 Login
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const data = await safeRequest<AuthResponse>(() =>
    api.post("/api/auth/login", credentials)
  );

  if (data?.access_token) {
    localStorage.setItem("accessToken", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setAuthToken(data.access_token);
  }

  return data;
}

// 🔹 Logout
export function logout(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  setAuthToken(undefined);
}

// 🔹 Register
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const data = await safeRequest<AuthResponse>(() =>
    api.post("/api/auth/register", payload)
  );

  if (data?.access_token) {
    localStorage.setItem("accessToken", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setAuthToken(data.access_token);
  }

  return data;
}

// 🔹 Refresh Token (optional)
export async function refreshToken(): Promise<string | null> {
  try {
    const data = await safeRequest<{ access_token: string }>(() =>
      api.post("/api/auth/refresh")
    );
    if (data.access_token) {
      localStorage.setItem("accessToken", data.access_token);
      setAuthToken(data.access_token);
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================
// 🔐 Password Management
// ============================

export async function forgotPassword(
  payload: ForgotPasswordPayload
): Promise<{ message: string }> {
  return await safeRequest<{ message: string }>(() =>
    api.post("/api/auth/forgot-password", payload)
  );
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ message: string }> {
  return await safeRequest<{ message: string }>(() =>
    api.post("/api/auth/reset-password", { token, password: newPassword })
  );
}

// ============================
// 👤 User Profile & Role Helpers
// ============================

export async function getProfile(): Promise<UserProfile> {
  return await safeRequest<UserProfile>(() => api.get("/api/auth/me"));
}

export function getCurrentUser(): UserProfile | null {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function getCurrentUserRole(): "admin" | "lecturer" | "student" | null {
  const user = getCurrentUser();
  return (user?.role as any) || null;
}

export function getAuthToken(): string | null {
  return localStorage.getItem("accessToken");
}
