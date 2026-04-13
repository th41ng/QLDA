import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { clearAuthSession, getStoredUser, setAuthSession } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [token, setToken] = useState(localStorage.getItem("auth_token"));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!token) {
      clearAuthSession();
      if (mounted) {
        setUser(null);
        setToken(null);
      }
      return () => {
        mounted = false;
      };
    }

    api.auth.me()
      .then((data) => {
        if (!mounted) return;
        setUser(data);
        setAuthSession(token, data);
      })
      .catch(() => {
        if (!mounted) return;
        clearAuthSession();
        setUser(null);
        setToken(null);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const loginWithPassword = async (email, password) => {
    const data = await api.auth.loginPassword(email, password);
    setAuthSession(data.token, data.user);
    setUser(data.user);
    setToken(data.token);
    return data.user;
  };

  const sendOtp = (payload) => api.auth.sendOtp(payload);

  const verifyOtp = async (payload) => {
    const data = await api.auth.verifyOtp(payload);
    setAuthSession(data.token, data.user);
    setUser(data.user);
    setToken(data.token);
    return data.user;
  };

  const resendOtp = (payload) => api.auth.resendOtp(payload);

  const loginOtpStart = (email) =>
    api.auth.sendOtp({ email, purpose: "login" });

  const loginOtpVerify = async (email, code) => {
    return verifyOtp({ email, purpose: "login", otp: code });
  };

  const registerPassword = async (payload) => {
    const data = await api.auth.registerPassword(payload);
    setAuthSession(data.token, data.user);
    setUser(data.user);
    setToken(data.token);
    return data.user;
  };

  const registerOtpStart = (payload) =>
    api.auth.sendOtp({
      email: payload.email,
      purpose: "register",
      role: payload.role,
      fullName: payload.full_name || payload.fullName,
      password: payload.password,
      confirmPassword: payload.confirm_password || payload.confirmPassword,
    });

  const registerOtpVerify = async (email, code) => {
    return verifyOtp({ email, purpose: "register", otp: code });
  };

  const logout = () => {
    clearAuthSession();
    setUser(null);
    setToken(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      setLoading,
      loginWithPassword,
      sendOtp,
      verifyOtp,
      resendOtp,
      loginOtpStart,
      loginOtpVerify,
      registerPassword,
      registerOtpStart,
      registerOtpVerify,
      logout,
      refreshMe: async () => {
        const data = await api.auth.me();
        setUser(data);
        return data;
      },
    }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
