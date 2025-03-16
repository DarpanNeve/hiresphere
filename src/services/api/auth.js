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

      // Store the token immediately after successful login
      if (response.data.access_token) {
        localStorage.setItem("token", response.data.access_token);
      }

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new APIError("Invalid email or password", 401);
      }
      if (error instanceof APIError) throw error;
      throw new APIError("Login failed", 500);
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);
      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new APIError(
          error.response.data.detail || "Registration failed",
          400
        );
      }
      if (error instanceof APIError) throw error;
      throw new APIError("Registration failed", 500);
    }
  },

  getProfile: async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new APIError("No authentication token", 401);
      }

      const response = await api.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        throw new APIError("Session expired", 401);
      }
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch profile", 500);
    }
  },

  refreshToken: async () => {
    try {
      const response = await api.post("/auth/refresh");
      if (response.data.access_token) {
        localStorage.setItem("token", response.data.access_token);
      }
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to refresh token", 500);
    }
  },
};
