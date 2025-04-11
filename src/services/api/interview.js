import { api, APIError } from "./config";

export const interviewApi = {
  startInterview: async (topic) => {
    try {
      // Clean up the topic string
      const cleanTopic = topic.trim();

      const response = await api.post("/interviews/start", {
        topic: cleanTopic,
        question_types: [
          "technical",
          "behavioral",
          "problem-solving",
          "experience",
          "scenario",
        ],
        difficulty_distribution: {
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
      });

      // Clean up questions before returning
      const cleanedQuestions = response.data.questions.map((q) =>
        typeof q === "string" ? q.replace(/["']/g, "").trim() : q
      );

      return {
        interview: response.data.interview,
        questions: cleanedQuestions,
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to start interview", 500);
    }
  },

  submitResponse: async (interviewId, response) => {
    try {
      // Clean up response text
      const cleanResponse = {
        ...response,
        response: {
          ...response.response,
          response: response.response.response.trim(),
        },
      };

      const result = await api.post(
        `/feedback/${interviewId}/submit`,
        cleanResponse
      );
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
        name: candidateInfo.name.trim(),
        email: candidateInfo.email.trim(),
      });

      // Clean up questions
      const cleanedQuestions = response.data.questions.map((q) =>
        typeof q === "string" ? q.replace(/["']/g, "").trim() : q
      );

      return {
        ...response.data,
        questions: cleanedQuestions,
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to start interview", 500);
    }
  },

  completePublicInterview: async (token, data) => {
    try {
      // Clean up responses
      const cleanedResponses = data.responses.map((response) => ({
        question: response.question.replace(/["']/g, "").trim(),
        response: response.response.trim(),
        questionIndex: response.questionIndex,
      }));

      const response = await api.post(`/public/interview/${token}/complete/`, {
        candidateInfo: {
          name: data.candidateInfo.name.trim(),
          email: data.candidateInfo.email.trim(),
        },
        responses: cleanedResponses,
      });
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to complete interview", 500);
    }
  },
};
