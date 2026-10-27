// Base API URL from environment variable or fallback to localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// In-memory access token storage (stateless and secure)
let inMemoryAccessToken = null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;
};

export const getAccessToken = () => {
  return inMemoryAccessToken;
};

// Safe access to localStorage inside functions only (avoids SSR errors)
const getRefreshToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("refreshToken");
  }
  return null;
};

const clearAuthAndRedirect = () => {
  inMemoryAccessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("refreshToken");
    if (window.location.pathname !== "/login") {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
  }
};

// Core fetch request handler with automatic 401 token refresh retry
const request = async (endpoint, options = {}, isRetry = false) => {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // Add Bearer access token if present in memory
  if (inMemoryAccessToken) {
    headers["Authorization"] = `Bearer ${inMemoryAccessToken}`;
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkError) {
    throw { message: "Network connection error. Ensure the backend server is running." };
  }

  // Handle 401 Unauthorized by attempting to refresh the access token once
  if (
    response.status === 401 &&
    !isRetry &&
    !endpoint.includes("/api/auth/refresh/") &&
    !endpoint.includes("/api/auth/login/")
  ) {
    const refreshToken = getRefreshToken();

    // If no refresh token exists, redirect to login
    if (!refreshToken) {
      clearAuthAndRedirect();
      const errorData = await response.json().catch(() => ({ message: "Unauthorized" }));
      throw errorData;
    }

    try {
      // Call refresh endpoint with stored refresh token
      const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        // Save the newly issued access token in memory
        inMemoryAccessToken = refreshData.accessToken;

        // Retry the original request exactly once
        return request(endpoint, options, true);
      } else {
        // Refresh token is expired or invalid
        clearAuthAndRedirect();
        const refreshError = await refreshResponse.json().catch(() => ({ message: "Session expired" }));
        throw refreshError;
      }
    } catch (err) {
      clearAuthAndRedirect();
      throw err;
    }
  }

  // Parse JSON response body if available
  const contentType = response.headers.get("content-type");
  let data = null;
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  // Handle non-2xx responses by throwing error payload (with status attached)
  if (!response.ok) {
    const err = typeof data === "object" && data !== null
      ? data
      : { message: `Request failed with status ${response.status}` };
    err.status = response.status;
    throw err;
  }

  return data;
};

// Exported API helpers
export const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: "GET" }),
  post: (endpoint, body, options = {}) =>
    request(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: (endpoint, body, options = {}) =>
    request(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: "DELETE" }),
};

