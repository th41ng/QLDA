import { apiRequest } from "../lib/api";

export const api = {
  auth: {
    me: () => apiRequest("/auth/me"),
    loginPassword: (email, password) =>
      apiRequest("/auth/login/password", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    sendOtp: (payload) =>
      apiRequest("/auth/otp/send", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    verifyOtp: (payload) =>
      apiRequest("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    resendOtp: (payload) =>
      apiRequest("/auth/otp/resend", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    registerPassword: (payload) =>
      apiRequest("/auth/register/password", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
};
