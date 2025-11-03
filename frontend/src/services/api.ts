import axios, { AxiosError } from "axios";

// ============================
// 🌍 Base API Configuration
// ============================
// ✅ Fixed: Remove /api suffix to prevent double prefix
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";
console.log("🌍 API base URL in use:", API_BASE);

// Create a reusable Axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 15 seconds timeout
  withCredentials: false, // Set to true if using cookies
});

// ============================
// 🔐 Dynamic Token Management
// ============================
export function setAuthToken(token?: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    console.log("🔑 Auth header set");
  } else {
    delete api.defaults.headers.common["Authorization"];
    console.log("🚫 Auth header cleared");
  }
}

// On startup — try to load token from localStorage (if present)
try {
  const savedToken = localStorage.getItem("accessToken"); // ✅ consistent with AdminDashboard
  if (savedToken) {
    setAuthToken(savedToken);
    console.log("✅ Auth token loaded from localStorage");
  } else {
    console.log("⚠️ No accessToken found in localStorage on startup");
  }
} catch (err) {
  console.warn("⚠️ Could not access localStorage:", err);
}

// ============================
// ⚙️ Request Interceptor (Debug)
// ============================
api.interceptors.request.use(
  (config) => {
    // Ensure the token is always up to date
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    // Log outgoing requests in development
    if (import.meta.env.DEV) {
      console.log(`➡️ ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
      });
    }

    return config;
  },
  (error) => {
    console.error("❌ Request setup error:", error);
    return Promise.reject(error);
  }
);

// ============================
// ⚙️ Response Interceptor (Error Handling)
// ============================
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`⬅️ ${response.status} ${response.config.url}`);
    }
    return response;
  },
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

        // Redirect to login if not already there
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }

      // Handle forbidden access
      if (error.response.status === 403) {
        console.warn("⚠️ Access forbidden");
      }
    } else if (error.request) {
      console.error("⚠️ No response received from API:", {
        url: error.config?.url,
        message: "Server may be down or unreachable",
      });
    } else {
      console.error("❌ Request setup error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
