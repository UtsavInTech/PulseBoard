import React, { createContext, useContext, useState, useCallback } from "react";
import { authAPI } from "../api/client";

const AuthContext = createContext(null);

function loadPersistedAuth() {
  try {
    const token = localStorage.getItem("auth_token");
    const user = JSON.parse(localStorage.getItem("auth_user") || "null");
    return token && user ? { token, user } : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadPersistedAuth);

  const persistAuth = useCallback((token, user) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
    setAuth({ token, user });
  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await authAPI.login({ username, password });
    persistAuth(data.access_token, data.user);
    return data.user;
  }, [persistAuth]);

  const register = useCallback(async (payload) => {
    const { data } = await authAPI.register(payload);
    persistAuth(data.access_token, data.user);
    return data.user;
  }, [persistAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setAuth(null);
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
