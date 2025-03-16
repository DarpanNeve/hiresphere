import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

const AUTH_STORAGE_KEY = "auth_data";
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load auth data from storage
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const authData = localStorage.getItem(AUTH_STORAGE_KEY);
        if (authData) {
          const { user: storedUser, token, expiry } = JSON.parse(authData);

          // Check if token needs refresh
          if (expiry && Date.now() > expiry - TOKEN_REFRESH_THRESHOLD) {
            await refreshToken();
          } else {
            setUser(storedUser);
            if (token) {
              localStorage.setItem("token", token);
            }
          }
        }
      } catch (err) {
        console.error("Error loading auth data:", err);
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    loadAuthData();
  }, []);

  // Save auth data to storage
  const saveAuthData = useCallback((userData, token, expiry) => {
    if (token) {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          user: userData,
          token,
          expiry,
        })
      );
      localStorage.setItem("token", token);
    }
  }, []);

  // Clear auth data
  const clearAuthData = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  // Refresh token
  const refreshToken = useCallback(async () => {
    try {
      const { access_token, expiry } = await authApi.refreshToken();
      if (user && access_token) {
        saveAuthData(user, access_token, expiry);
      }
    } catch (err) {
      console.error("Error refreshing token:", err);
      clearAuthData();
    }
  }, [user, saveAuthData, clearAuthData]);

  // Check auth status
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        clearAuthData();
        return;
      }

      const userData = await authApi.getProfile();
      if (userData) {
        setUser(userData);
        // Calculate token expiry (24 hours from now)
        const expiry = Date.now() + 24 * 60 * 60 * 1000;
        saveAuthData(userData, token, expiry);
      }

      setError(null);
    } catch (err) {
      console.error("Auth check failed:", err);
      clearAuthData();
      setError(err.message);
    }
  }, [saveAuthData, clearAuthData]);

  // Login handler
  const login = useCallback(
    async (email, password) => {
      try {
        setError(null);
        const { access_token, token_type } = await authApi.login(
          email,
          password
        );

        if (access_token) {
          // Calculate token expiry (24 hours from now)
          const expiry = Date.now() + 24 * 60 * 60 * 1000;

          // Get user profile
          const userData = await authApi.getProfile();
          if (userData) {
            setUser(userData);
            saveAuthData(userData, access_token, expiry);
            return true;
          }
        }
        throw new Error("Login failed - no token received");
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [saveAuthData]
  );

  // Register handler
  const register = useCallback(async (userData) => {
    try {
      setError(null);
      await authApi.register(userData);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    clearAuthData();
  }, [clearAuthData]);

  // Role checks
  const isHR = useCallback(() => {
    return user?.role === "hr";
  }, [user]);

  const isAdmin = useCallback(() => {
    return user?.role === "admin";
  }, [user]);

  // Context value
  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isHR,
    isAdmin,
    checkAuth,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
