import { api, APIError } from "./config";

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
      if (error instanceof APIError) throw error;
      throw new APIError("Login failed", 500);
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Registration failed", 500);
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get("/auth/me");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch profile", 500);
    }
  },
};
