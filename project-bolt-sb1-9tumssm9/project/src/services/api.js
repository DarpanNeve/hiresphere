import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const interviewApi = {
  startInterview: async (topic) => {
    const response = await api.post('/interviews/start', { topic });
    return response.data;
  },

  submitResponse: async (interviewId, response) => {
    const result = await api.post(`/interviews/${interviewId}/response`, { response });
    return result.data;
  },

  getHistory: async () => {
    const response = await api.get('/interviews/history');
    return response.data;
  },

  getAnalysis: async (interviewId) => {
    const response = await api.get(`/interviews/${interviewId}/analysis`);
    return response.data;
  }
};

export const authApi = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { username: email, password });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};