import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { setAuthToken } from "@/services/api";
import {
  login,
  logout,
  getProfile,
  refreshToken,
  AuthResponse,
  getAuthToken,
  getCurrentUser,
} from "@/services/authApi";

/* -------------------------------------------------------------------------- */
/*                            🔐 Context Interfaces                           */
/* -------------------------------------------------------------------------- */
interface User {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

/* -------------------------------------------------------------------------- */
/*                                🔧 Context Setup                             */
/* -------------------------------------------------------------------------- */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

/* -------------------------------------------------------------------------- */
/*                             🧩 Auth Provider                               */
/* -------------------------------------------------------------------------- */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [loading, setLoading] = useState(true);

  /* ------------------------------------------------------ */
  /*  Restore Session on Load                               */
  /* ------------------------------------------------------ */
  useEffect(() => {
    if (token) setAuthToken(token);

    const restoreSession = async () => {
      try {
        if (token && !user) {
          const profile = await getProfile();
          setUser(profile);
        }
      } catch (err) {
        console.warn("⚠️ Failed to restore session:", err);
        await handleLogout();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only run once on mount

  /* ------------------------------------------------------ */
  /*  Persist Token and User                                */
  /* ------------------------------------------------------ */
  useEffect(() => {
    if (token) localStorage.setItem("accessToken", token);
    else localStorage.removeItem("accessToken");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  /* ------------------------------------------------------ */
  /*  Auto Refresh Token                                    */
  /* ------------------------------------------------------ */
  const refreshAccessToken = useCallback(async () => {
    try {
      const newToken = await refreshToken();
      if (newToken) {
        setToken(newToken);
        setAuthToken(newToken);
      } else {
        console.warn("⚠️ No new token received — logging out.");
        await handleLogout();
      }
    } catch (err) {
      console.error("❌ Token refresh failed:", err);
      await handleLogout();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (token) refreshAccessToken();
    }, 10 * 60 * 1000); // every 10 minutes

    return () => clearInterval(interval);
  }, [token, refreshAccessToken]);

  /* ------------------------------------------------------ */
  /*  Real Login (immediate user state update)               */
  /* ------------------------------------------------------ */
  const handleLogin = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const credentials = { email, password };
      const response: AuthResponse = await login(credentials);

      setToken(response.access_token);
      setAuthToken(response.access_token);
      setUser(response.user);

      // Persist immediately
      localStorage.setItem("accessToken", response.access_token);
      localStorage.setItem("user", JSON.stringify(response.user));
    } catch (error: any) {
      console.error("❌ Login failed:", error.response?.data || error.message);
      throw error.response?.data || error;
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------ */
  /*  Real Logout                                            */
  /* ------------------------------------------------------ */
  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      logout();
    } catch (err) {
      console.warn("⚠️ Logout failed:", err);
    } finally {
      setToken(null);
      setUser(null);
      setAuthToken(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      window.location.href = "/login"; // 🔹 redirect to correct login path
    }
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    loading,
    login: handleLogin,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
