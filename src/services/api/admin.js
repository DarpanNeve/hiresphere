import { api, APIError } from "./config";

export const adminApi = {
  // Dashboard
  getDashboardStats: async () => {
    try {
      const response = await api.get("/admin/dashboard/stats");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch dashboard stats", 500);
    }
  },

  // HR Management
  getHRUsers: async () => {
    try {
      const response = await api.get("/admin/hr-users");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch HR users", 500);
    }
  },

  createHRUser: async (userData) => {
    try {
      // Transform the data to match the backend expectations
      const transformedData = {
        email: userData.email,
        password: userData.password,
        full_name: userData.full_name,
        company_name: userData.company_name,
        role: "hr",
        status: userData.status || "active",
      };

      const response = await api.post("/admin/hr-users/", transformedData);
      return response.data;
    } catch (error) {
      if (error.response?.data?.detail) {
        throw new APIError(error.response.data.detail, error.response.status);
      }
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to create HR user", 500);
    }
  },

  updateHRUser: async (userId, userData) => {
    try {
      const response = await api.put(`/admin/hr-users/${userId}`, userData);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to update HR user", 500);
    }
  },

  deleteHRUser: async (userId) => {
    try {
      await api.delete(`/admin/hr-users/${userId}`);
      return true;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to delete HR user", 500);
    }
  },

  // Subscription Management
  getAllSubscriptions: async () => {
    try {
      const response = await api.get("/admin/subscriptions");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch subscriptions", 500);
    }
  },

  updateSubscription: async (subscriptionId, data) => {
    try {
      const response = await api.put(
        `/admin/subscriptions/${subscriptionId}`,
        data
      );
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to update subscription", 500);
    }
  },

  cancelSubscription: async (subscriptionId) => {
    try {
      await api.post(`/admin/subscriptions/${subscriptionId}/cancel`);
      return true;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to cancel subscription", 500);
    }
  },

  // Settings
  getSettings: async () => {
    try {
      const response = await api.get("/admin/settings");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch settings", 500);
    }
  },

  updateSettings: async (settings) => {
    try {
      const response = await api.put("/admin/settings", settings);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to update settings", 500);
    }
  },
};
