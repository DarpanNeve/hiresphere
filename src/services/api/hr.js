import { api, APIError } from "./config";

export const hrApi = {
  getCandidates: async () => {
    try {
      const response = await api.get("/hr/candidates");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch candidates", 500);
    }
  },

  addCandidate: async (candidateData) => {
    try {
      const response = await api.post("/hr/candidates", candidateData);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
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
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to update candidate", 500);
    }
  },

  deleteCandidate: async (candidateId) => {
    try {
      const response = await api.delete(`/hr/candidates/${candidateId}`);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to delete candidate", 500);
    }
  },

  getInterviewLinks: async () => {
    try {
      const response = await api.get("/hr/interview-links/");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch interview links", 500);
    }
  },

  createInterviewLink: async (linkData) => {
    try {
      const transformedData = {
        candidate_name: linkData.candidateName,
        candidate_email: linkData.candidateEmail,
        position: linkData.position,
        topic: linkData.topic,
        expires_in: parseInt(linkData.expiresIn) || 7,
      };

      const response = await api.post("/hr/interview-links/", transformedData);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to create interview link", 500);
    }
  },

  deleteInterviewLink: async (linkId) => {
    if (!linkId) {
      throw new APIError("Invalid link ID", 400);
    }
    try {
      const response = await api.delete(`/hr/interview-links/${linkId}/`);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to delete interview link", 500);
    }
  },

  resendInterviewEmail: async (linkId) => {
    if (!linkId) {
      throw new APIError("Invalid link ID", 400);
    }
    try {
      const response = await api.post(`/hr/interview-links/${linkId}/resend/`);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to resend email", 500);
    }
  },

  getReports: async (filter) => {
    try {
      const response = await api.get("/hr/reports", { params: filter });
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch reports", 500);
    }
  },

  getReportStats: async (filter) => {
    try {
      const response = await api.get("/hr/reports/stats", { params: filter });
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch report stats", 500);
    }
  },

  getDashboardStats: async () => {
    try {
      const response = await api.get("/hr/dashboard/stats");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch dashboard stats", 500);
    }
  },

  getRecentInterviews: async () => {
    try {
      const response = await api.get("/hr/dashboard/recent-interviews");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch recent interviews", 500);
    }
  },

  getSubscription: async () => {
    try {
      const response = await api.get("/hr/subscription");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
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
      if (error instanceof APIError) throw error;
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
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to update payment method", 500);
    }
  },

  cancelSubscription: async () => {
    try {
      const response = await api.post("/hr/subscription/cancel");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to cancel subscription", 500);
    }
  },
};
