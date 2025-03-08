import axios from "axios";

// Custom error class for API errors
export class APIError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = "APIError";
    this.code = code;
    this.details = details;
  }
}

export const api = axios.create({
  baseURL: __API_URL__,
  timeout: 30000, // 30 second timeout for all requests
});

// Request interceptor for adding auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      let message =
        error.response.data?.detail || "An unexpected error occurred";
      const code = error.response.status;
      const details = error.response.data;

      if (code === 422 && Array.isArray(error.response.data)) {
        message = error.response.data.map((err) => err.msg).join(", ");
      }

      switch (code) {
        case 401:
          localStorage.removeItem("token");
          window.location.href = "/login";
          break;
        case 403:
          console.error("Permission denied:", message);
          break;
        case 422:
          console.error("Validation error:", details);
          break;
        case 429:
          console.error("Rate limit exceeded");
          break;
      }

      throw new APIError(message, code, details);
    } else if (error.request) {
      throw new APIError("Network error - no response from server", 0);
    } else {
      throw new APIError("Failed to make request", 0);
    }
  }
);
