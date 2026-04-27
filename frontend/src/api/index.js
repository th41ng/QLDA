import { apiDownload, apiRequest } from "../lib/api";

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
    loginOtpStart: (email) =>
      apiRequest("/auth/login/otp/start", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    loginOtpVerify: (email, code) =>
      apiRequest("/auth/login/otp/verify", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      }),
    registerPassword: (payload) =>
      apiRequest("/auth/register/password", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    registerOtpStart: (payload) =>
      apiRequest("/auth/register/otp/start", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    registerOtpVerify: (email, code) =>
      apiRequest("/auth/register/otp/verify", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      }),
  },
  jobs: {
    list: (params = "") => apiRequest(`/jobs${params}`, { auth: false }),
    mine: (params = "") => apiRequest(`/jobs/mine${params}`),
    detail: (id) => apiRequest(`/jobs/${id}`, { auth: false }),
    screen: (id) => apiRequest(`/jobs/${id}/screen`),
    create: (payload) => apiRequest("/jobs", { method: "POST", body: JSON.stringify(payload) }),
    update: (id, payload) => apiRequest(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    delete: (id) => apiRequest(`/jobs/${id}`, { method: "DELETE" }),
  },
  tags: {
    list: (params = "") => apiRequest(`/tags${params}`, { auth: false }),
    categories: () => apiRequest("/tags/categories", { auth: false }),
  },
  statistics: {
    landing: () => apiRequest("/statistics/landing", { auth: false }),
  },
  resumes: {
    list: () => apiRequest("/resumes"),
    templates: () => apiRequest("/resumes/templates", { auth: false }),
    detail: (id) => apiRequest(`/resumes/${id}`),
    createManual: (payload) =>
      apiRequest("/resumes/manual", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    createFromTemplate: (payload) =>
      apiRequest("/resumes/from-template", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    upload: (formData) => apiRequest("/resumes/upload", { method: "POST", body: formData }),
    parsePreview: (formData) => apiRequest("/resumes/parse-preview", { method: "POST", body: formData }),
    parseAndCreate: (formData) => apiRequest("/resumes/parse-and-create", { method: "POST", body: formData }),
    update: (id, payload) =>
      apiRequest(`/resumes/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    remove: (id) => apiRequest(`/resumes/${id}`, { method: "DELETE" }),
    updateProfile: (payload) =>
      apiRequest("/profiles/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    getProfile: () => apiRequest("/profiles/me"),
    exportUrl: (resumeId, format = "pdf") =>
      `${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5001/api"}/resumes/${resumeId}/export?format=${format}`,
    exportFile: (resumeId, format = "pdf", filename = `resume-${resumeId}.${format}`) =>
      apiDownload(`/resumes/${resumeId}/export?format=${format}`, {
        filename,
      }),
    originalFileUrl: (resumeId) =>
      `${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5001/api"}/resumes/${resumeId}/export?format=original`,
    recommendations: () => apiRequest("/resumes/recommendations"),
    preview: (payload) =>
    apiRequest("/resumes/preview", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    generatePdf: (payload) =>
    apiRequest("/resumes/generate-pdf", {
      method: "POST",
      body: JSON.stringify(payload),
      responseType: "blob",  // ← Important!
    }),
  },
  companies: {
    me: () => apiRequest("/companies/me"),
    followed: () => apiRequest("/companies/follows"),
    follow: (companyId) => apiRequest(`/companies/${companyId}/follow`, { method: "PUT" }),
    unfollow: (companyId) => apiRequest(`/companies/${companyId}/follow`, { method: "DELETE" }),
    featured: ({ q = "", page = 1, perPage = 6 } = {}) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("page", String(page));
      params.set("per_page", String(perPage));
      return apiRequest(`/companies/featured?${params.toString()}`, { auth: false });
    },
    updateMe: (payload) =>
      apiRequest("/companies/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
  },
  applications: {
    create: (payload) =>
      apiRequest("/applications", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    checkForJob: (jobId) => apiRequest(`/applications/check?job_id=${jobId}`),
    myApplications: () => apiRequest("/applications/mine"),
    recruiterApplications: () => apiRequest("/applications/recruiter"),
    recruiterApplicationResume: (applicationId) => apiRequest(`/applications/${applicationId}/resume`),
    recruiterResumePdfUrl: (applicationId) =>
      `${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5001/api"}/applications/${applicationId}/resume/pdf`,
    updateStatus: (id, payload) =>
      apiRequest(`/applications/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(typeof payload === "string" ? { status: payload } : payload),
      }),
    setShortlist: async (applicationId, shouldShortlist) => {
      const status = shouldShortlist ? "reviewing" : "submitted";
      const resp = await apiRequest(`/applications/${applicationId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      return {
        is_shortlisted: status === "reviewing",
        shortlisted_at: resp?.updated_at || null,
        application: resp,
      };
    },
  },
  notifications: {
    myNotifications: (limit = 10) => apiRequest(`/notifications/mine?limit=${limit}`),
    markRead: (id) =>
      apiRequest(`/notifications/${id}/read`, {
        method: "PATCH",
      }),
  },
  admin: {
    login: (email, password) =>
      apiRequest("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        auth: false,
      }),
    getAll: () => apiRequest("/admin"),
    getById: (id) => apiRequest(`/admin/${id}`),
    create: (payload) =>
      apiRequest("/admin", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id, payload) =>
      apiRequest(`/admin/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    delete: (id) =>
      apiRequest(`/admin/${id}`, {
        method: "DELETE",
      }),
    search: (query) =>
      apiRequest(`/admin/search/${query}`),
    changePassword: (id, payload) =>
      apiRequest(`/admin/${id}/change-password`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  users: {
    getAll: (role, status, search) => {
      let url = "/users";
      const params = new URLSearchParams();
      if (role) params.append("role", role);
      if (status) params.append("status", status);
      if (search) params.append("search", search);
      if (params.toString()) url += `?${params.toString()}`;
      return apiRequest(url);
    },
    getById: (id) => apiRequest(`/users/${id}`),
    create: (payload) =>
      apiRequest("/users", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id, payload) =>
      apiRequest(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    delete: (id) =>
      apiRequest(`/users/${id}`, {
        method: "DELETE",
      }),
    search: (query) =>
      apiRequest(`/users/search/${query}`),
    stats: () => apiRequest("/users/stats/overview"),
  },
};
