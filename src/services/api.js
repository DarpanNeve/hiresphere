import axios from "axios";

// Custom error class for API errors
class APIError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = "APIError";
    this.code = code;
    this.details = details;
  }
}

const api = axios.create({
  baseURL: "https://hiresphere-eita.onrender.com/api",
  timeout: 30000, // 30 second timeout for all requests
  withCredentials: true,
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
      // Server responded with error
      let message =
        error.response.data?.detail || "An unexpected error occurred";
      const code = error.response.status;
      const details = error.response.data;

      // Handle validation errors
      if (code === 422 && Array.isArray(error.response.data)) {
        message = error.response.data.map((err) => err.msg).join(", ");
      }

      // Handle specific error cases
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
      // Request made but no response
      throw new APIError("Network error - no response from server", 0);
    } else {
      // Request setup error
      throw new APIError("Failed to make request", 0);
    }
  }
);

export const interviewApi = {
  startInterview: async (topic) => {
    try {
      const response = await api.post("/interviews/start", { topic });
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to start interview", 500);
    }
  },

  submitResponse: async (interviewId, response) => {
    try {
      const result = await api.post(
        `/feedback/${interviewId}/submit`,
        response
      );
      return result.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to submit response", 500);
    }
  },

  completeInterview: async (interviewId) => {
    try {
      const result = await api.post(`/interviews/${interviewId}/complete`);
      return result.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to complete interview", 500);
    }
  },

  analyzeInterview: async (interviewId) => {
    try {
      const result = await api.post(`/feedback/${interviewId}/analyze`);
      return result.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to analyze interview", 500);
    }
  },

  getAnalysisStatus: async (interviewId) => {
    try {
      const response = await api.get(`/feedback/status/${interviewId}`);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to get analysis status", 500);
    }
  },

  getHistory: async () => {
    try {
      const response = await api.get("/interviews/history");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to fetch interview history", 500);
    }
  },

  getAnalysis: async (interviewId) => {
    try {
      const response = await api.get(`/feedback/${interviewId}`);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to fetch analysis", 500);
    }
  },

  getRecentSummary: async () => {
    try {
      const response = await api.get("/feedback/summary/recent");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to fetch summary", 500);
    }
  },

  validateInterviewLink: async (linkId) => {
    try {
      const response = await api.get(`/public/interview/${linkId}/validate`);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to validate interview link", 500);
    }
  },

  startPublicInterview: async (linkId, candidateInfo) => {
    try {
      const response = await api.post(
        `/public/interview/${linkId}/start`,
        candidateInfo
      );
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to start interview", 500);
    }
  },

  completePublicInterview: async (linkId, data) => {
    try {
      const response = await api.post(
        `/public/interview/${linkId}/complete`,
        data
      );
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to complete interview", 500);
    }
  },
};

export const authApi = {
  login: async (email, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await api.post("/auth/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Login failed", 500);
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Registration failed", 500);
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get("/auth/me");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to fetch profile", 500);
    }
  },
};

export const hrApi = {
  // Candidate management
  getCandidates: async () => {
    try {
      const response = await api.get("/hr/candidates");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to fetch candidates", 500);
    }
  },

  addCandidate: async (candidateData) => {
    try {
      const response = await api.post("/hr/candidates", candidateData);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to add candidate", 500);
    }
  },

  updateCandidate: async (candidateId, candidateData) => {
    try {
      const response = await api.put(
        `/hr/candidates/${candidateId}`,
        candidateData
      );
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to update candidate", 500);
    }
  },

  deleteCandidate: async (candidateId) => {
    try {
      const response = await api.delete(`/hr/candidates/${candidateId}`);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to delete candidate", 500);
    }
  },

  // Interview links
  getInterviewLinks: async () => {
    try {
      const response = await api.get("/hr/interview-links/");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to fetch interview links", 500);
    }
  },

  createInterviewLink: async (linkData) => {
    try {
      const response = await api.post("/hr/interview-links/", linkData); // Note the trailing slash
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to create interview link", 500);
    }
  },
  deleteInterviewLink: async (linkId) => {
    try {
      const response = await api.delete(`/hr/interview-links/${linkId}`);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to delete interview link", 500);
    }
  },

  resendInterviewEmail: async (linkId) => {
    try {
      const response = await api.post(`/hr/interview-links/${linkId}/resend`);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to resend email", 500);
    }
  },

  // Reports
  getReports: async (filter) => {
    try {
      const response = await api.get("/hr/reports", { params: filter });
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to fetch reports", 500);
    }
  },

  getReportStats: async (filter) => {
    try {
      const response = await api.get("/hr/reports/stats", { params: filter });
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to fetch report stats", 500);
    }
  },

  // Dashboard
  getDashboardStats: async () => {
    try {
      const response = await api.get("/hr/dashboard/stats");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to fetch dashboard stats", 500);
    }
  },

  getRecentInterviews: async () => {
    try {
      const response = await api.get("/hr/dashboard/recent-interviews");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to fetch recent interviews", 500);
    }
  },

  // Subscription
  getSubscription: async () => {
    try {
      const response = await api.get("/hr/subscription");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to fetch subscription", 500);
    }
  },

  updateSubscription: async (planId) => {
    try {
      const response = await api.post("/hr/subscription/update", {
        plan: planId,
      });
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to update subscription", 500);
    }
  },

  updatePaymentMethod: async (paymentData) => {
    try {
      const response = await api.post(
        "/hr/subscription/payment-method",
        paymentData
      );
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to update payment method", 500);
    }
  },

  cancelSubscription: async () => {
    try {
      const response = await api.post("/hr/subscription/cancel");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError("Failed to cancel subscription", 500);
    }
  },
};
