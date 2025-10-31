// frontend/src/services/api.ts
import axios, { AxiosError } from "axios";

// ============================
// 🌍 Base API Configuration
// ============================
// const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";
console.log("🌍 API base URL in use:", API_BASE);


// Create a reusable Axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 15 seconds timeout
});

// ============================
// 🔐 Dynamic Token Management
// ============================
export function setAuthToken(token?: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

// On startup — try to load token from localStorage (if present)
try {
  const savedToken = localStorage.getItem("accessToken"); // ✅ unified with authApi
  if (savedToken) {
    setAuthToken(savedToken);
  }
} catch {
  // ignore if localStorage not available
}

// ============================
// ⚙️ Interceptors for Debug & Error Handling
// ============================
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      console.error("🚨 API Error:", {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });

      // Global auth expiration handling
      if (error.response.status === 401) {
        console.warn("⚠️ Token expired or unauthorized — clearing local auth");

        try {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
        } catch {}

        setAuthToken(null);

        // Optionally redirect to login page
        // window.location.href = "/login";
      }
    } else if (error.request) {
      console.error("⚠️ No response received from API:", error.request);
    } else {
      console.error("❌ Request setup error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
