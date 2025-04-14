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
      // Transform URLs to use frontend URL
      const links = response.data.map((link) => ({
        ...link,
        url: `${import.meta.env.VITE_FRONTEND_URL}/interview/${link.token}`,
      }));
      return links;
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
        question_types: [
          "technical",
          "behavioral",
          "problem-solving",
          "experience",
          "scenario",
        ],
        difficulty_distribution: {
          easy: 2,
          medium: 4,
          hard: 2,
        },
        categories: [
          "core_concepts",
          "best_practices",
          "problem_solving",
          "system_design",
          "communication",
          "teamwork",
        ],
      };

      const response = await api.post("/hr/interview-links/", transformedData);

      // Transform the URL to use frontend URL
      return {
        ...response.data,
        url: `${import.meta.env.VITE_FRONTEND_URL}/interview/${
          response.data.token
        }`,
      };
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
      const params = new URLSearchParams({
        ...filter,
        include_analytics: true,
        include_feedback: true,
        include_responses: true,
      });
      const response = await api.get(`/hr/reports?${params}`);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch reports", 500);
    }
  },

  getReportStats: async (filter) => {
    try {
      const params = new URLSearchParams({
        ...filter,
        include_trends: true,
        include_position_stats: true,
        include_score_distribution: true,
      });
      const response = await api.get(`/hr/reports/stats?${params}`);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch report stats", 500);
    }
  },

  getDashboardStats: async () => {
    try {
      const response = await api.get("/hr/dashboard/stats?include_trends=true");
      return {
        totalCandidates: response.data.total_candidates || 0,
        activeInterviews: response.data.active_interviews || 0,
        completedInterviews: response.data.completed_interviews || 0,
        averageScore: response.data.average_score || 0,
        recentTrends: response.data.trends || [],
        positionStats: response.data.position_stats || [],
        completionRate: response.data.completion_rate || 0,
        averageResponseTime: response.data.average_response_time || 0,
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch dashboard stats", 500);
    }
  },

  getRecentInterviews: async () => {
    try {
      const response = await api.get(
        "/hr/dashboard/recent-interviews?include_details=true"
      );
      return response.data.interviews.map((interview) => ({
        id: interview.id,
        candidateName: interview.candidate_name,
        position: interview.position,
        date: interview.created_at,
        status: interview.status,
        duration: interview.duration,
        scores: interview.scores
          ? {
              knowledge: Math.round(interview.scores.knowledge * 10) / 10,
              communication:
                Math.round(interview.scores.communication * 10) / 10,
              confidence: Math.round(interview.scores.confidence * 10) / 10,
            }
          : null,
        feedback: interview.feedback,
        questionCount: interview.question_count,
        completionTime: interview.completion_time,
      }));
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
