const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5001/api";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

function buildHeaders(initHeaders = {}, body, includeAuth = true) {
  const headers = new Headers(initHeaders);
  const token = includeAuth ? localStorage.getItem(TOKEN_KEY) : null;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseResponse(response, options = {}) {
  const contentType = response.headers.get("content-type") || "";
 
  // Handle blob/file responses (e.g., PDF downloads)
  if (options.responseType === "blob" || contentType.includes("application/pdf") || contentType.includes("application/octet-stream")) {
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed with status ${response.status}`);
    }
    return await response.blob();
  }
 
  // Handle HTML responses (e.g., preview)
  if (contentType.includes("text/html")) {
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed with status ${response.status}`);
    }
    return await response.text();
  }
 
  // Handle JSON responses
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `Request failed with status ${response.status}`);
    }
    return text;
  }
 
  const payload = await response.json();
 
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }
 
  return payload?.data ?? payload;
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: buildHeaders(options.headers, options.body, options.auth !== false),
  });
 
  return parseResponse(response, options);  // ← Thêm options
}

export function setAuthSession(token, user) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}
