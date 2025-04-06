import { api, APIError } from "./config";

export const interviewApi = {
  startInterview: async (topic) => {
    try {
      // Adjust the difficulty distribution based on topic
      const isBasicTopic =
        topic.toLowerCase().includes("basics") ||
        topic.toLowerCase().includes("fundamentals") ||
        topic.toLowerCase().includes("introduction");

      const response = await api.post("/interviews/start", {
        topic,
        question_types: [
          "technical",
          "behavioral",
          "problem-solving",
          "experience",
          "scenario",
        ],
        difficulty_distribution: isBasicTopic
          ? {
              easy: 3,
              medium: 2,
              hard: 0,
            }
          : {
              easy: 2,
              medium: 2,
              hard: 1,
            },
        categories: [
          "core_concepts",
          "best_practices",
          "problem_solving",
          "system_design",
          "communication",
          "teamwork",
        ],
        // Add topic context to help generate appropriate questions
        context: {
          isBasicLevel: isBasicTopic,
          topicScope: isBasicTopic ? "fundamental" : "comprehensive",
          expectedDepth: isBasicTopic ? "basic" : "intermediate",
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to start interview", 500);
    }
  },

  submitResponse: async (interviewId, response) => {
    try {
      // Add response quality check
      const responseQuality = analyzeResponseQuality(
        response.response.response
      );

      const result = await api.post(`/feedback/${interviewId}/submit`, {
        ...response,
        responseQuality,
        // Add metadata to help with scoring
        metadata: {
          wordCount: response.response.response.split(" ").length,
          hasValidResponse: responseQuality.isValid,
          isDefaultResponse: responseQuality.isDefault,
        },
      });
      return result.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to submit response", 500);
    }
  },

  completeInterview: async (interviewId) => {
    try {
      const result = await api.post(`/interviews/${interviewId}/complete`);
      return result.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to complete interview", 500);
    }
  },

  analyzeInterview: async (interviewId) => {
    try {
      const result = await api.post(`/feedback/${interviewId}/analyze`);
      return result.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to analyze interview", 500);
    }
  },

  getAnalysisStatus: async (interviewId) => {
    try {
      const response = await api.get(`/feedback/status/${interviewId}`);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to get analysis status", 500);
    }
  },

  getHistory: async () => {
    try {
      const response = await api.get("/interviews/history");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch interview history", 500);
    }
  },

  getAnalysis: async (interviewId) => {
    try {
      const response = await api.get(`/feedback/${interviewId}`);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch analysis", 500);
    }
  },

  getRecentSummary: async () => {
    try {
      const response = await api.get("/feedback/summary/recent");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch summary", 500);
    }
  },

  validateInterviewLink: async (token) => {
    try {
      const response = await api.get(`/public/interview/${token}/validate/`);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to validate interview link", 500);
    }
  },

  startPublicInterview: async (token, candidateInfo) => {
    try {
      const response = await api.post(`/public/interview/${token}/start/`, {
        name: candidateInfo.name,
        email: candidateInfo.email,
      });
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to start interview", 500);
    }
  },

  completePublicInterview: async (token, data) => {
    try {
      const response = await api.post(`/public/interview/${token}/complete/`, {
        candidateInfo: {
          name: data.candidateInfo.name,
          email: data.candidateInfo.email,
        },
        responses: data.responses.map((response, index) => ({
          question: response.question,
          response: response.response,
          questionIndex: index,
        })),
      });
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to complete interview", 500);
    }
  },

  // Helper function to analyze response quality
  analyzeResponseQuality(response) {
    const lowQualityResponses = [
      "i don't know",
      "idk",
      "not sure",
      "no idea",
      "skip",
      "pass",
      "",
    ];

    const responseText = response.toLowerCase().trim();

    return {
      isValid: !lowQualityResponses.some((phrase) =>
        responseText.includes(phrase)
      ),
      isDefault: lowQualityResponses.some((phrase) =>
        responseText.includes(phrase)
      ),
      wordCount: response.split(" ").length,
      hasContent: responseText.length > 0,
    };
  },
};
