"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, setAccessToken } from "@/lib/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // On initial mount, restore session if a valid refreshToken is stored in localStorage
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedRefreshToken = localStorage.getItem("refreshToken");
        if (storedRefreshToken) {
          // 1. Get a fresh access token using the stored refresh token
          const refreshData = await api.post("/api/auth/refresh/", {
            refreshToken: storedRefreshToken,
          });

          // 2. Set the access token in memory
          setAccessToken(refreshData.accessToken);

          // 3. Fetch user profile
          const meData = await api.get("/api/auth/me/");
          setUser(meData.user);
        }
      } catch (err) {
        // If refresh fails, clear token and user state
        localStorage.removeItem("refreshToken");
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Login: authenticate credentials, store refresh token, keep access token in memory
  const login = async (email, password) => {
    const data = await api.post("/api/auth/login/", { email, password });
    localStorage.setItem("refreshToken", data.refreshToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  };

  // Logout: clears storage, memory tokens, and routes to /login
  const logout = () => {
    localStorage.removeItem("refreshToken");
    setAccessToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for accessing auth context
export const useAuth = () => useContext(AuthContext);
