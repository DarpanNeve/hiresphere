import axios from "axios";

// Request queue implementation
class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const { request, resolve, reject } = this.queue.shift();

    try {
      const response = await request();
      resolve(response);
    } catch (error) {
      reject(error);
    } finally {
      this.processing = false;
      this.processQueue();
    }
  }
}

// Custom error class for API errors
export class APIError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = "APIError";
    this.code = code;
    this.details = details;
  }
}

// Create request queue instance
const requestQueue = new RequestQueue();

// Create axios instance with default config
export const api = axios.create({
  baseURL: __API_URL__,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Keep track of redirect status
let isRedirecting = false;

// Request interceptor
api.interceptors.request.use(async (config) => {
  // Get token from localStorage
  const token = localStorage.getItem("token");

  // Add authorization header if token exists and it's not a login request
  if (token && !config.url?.includes("/auth/login")) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add request to queue for concurrent request management
  return requestQueue.add(async () => {
    // Add timestamp to request for cache busting when needed
    if (config.method === "get" && config.params?.bustCache) {
      config.params._t = Date.now();
    }
    return config;
  });
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Initialize retry count if not exists
    if (typeof originalRequest._retry === "undefined") {
      originalRequest._retry = 0;
    }

    if (error.response) {
      const code = error.response.status;
      let message =
        error.response.data?.detail || "An unexpected error occurred";
      const details = error.response.data;

      // Handle validation errors
      if (code === 422 && Array.isArray(error.response.data)) {
        message = error.response.data.map((err) => err.msg).join(", ");
      }

      // Log error details for debugging
      console.error("API Error:", {
        status: code,
        message: message,
        details: details,
        url: error.config.url,
        method: error.config.method,
      });

      // Handle specific error codes
      switch (code) {
        case 401:
          // Only handle unauthorized if not already redirecting and not a login request
          if (!isRedirecting && !originalRequest.url.includes("/auth/login")) {
            isRedirecting = true;
            localStorage.removeItem("token");
            localStorage.removeItem("auth_data");

            // Use window.location.replace to prevent adding to history
            window.location.replace("/login");
            return Promise.reject(error);
          }
          break;

        case 403:
          console.error("Permission denied:", message);
          break;

        case 429:
          // Rate limit exceeded - implement exponential backoff
          if (originalRequest._retry < MAX_RETRIES) {
            originalRequest._retry++;
            const delay = RETRY_DELAY * Math.pow(2, originalRequest._retry - 1);
            await sleep(delay);
            return api(originalRequest);
          }
          break;
      }

      // Retry on specific status codes
      if (
        RETRY_STATUS_CODES.includes(code) &&
        originalRequest._retry < MAX_RETRIES
      ) {
        originalRequest._retry++;
        await sleep(RETRY_DELAY);
        return api(originalRequest);
      }

      throw new APIError(message, code, details);
    } else if (error.request) {
      // Handle network errors
      console.error("Network Error:", error.request);
      throw new APIError("Network error - no response from server", 0);
    } else {
      console.error("Request Error:", error.message);
      throw new APIError("Failed to make request", 0);
    }
  }
);

// Reset redirect status when navigating
window.addEventListener("popstate", () => {
  isRedirecting = false;
});

// Add request helpers
api.helpers = {
  // Retry a failed request with exponential backoff
  async retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        return await fn();
      } catch (error) {
        retries++;
        if (retries === maxRetries) throw error;
        await sleep(initialDelay * Math.pow(2, retries - 1));
      }
    }
  },

  // Make a cached request
  async cachedRequest(key, fn, ttl = 5 * 60 * 1000) {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ttl) {
        return data;
      }
    }
    const data = await fn();
    localStorage.setItem(
      key,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
    return data;
  },

  // Clear all cached requests
  clearCache() {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("cache:")) {
        localStorage.removeItem(key);
      }
    });
  },
};
