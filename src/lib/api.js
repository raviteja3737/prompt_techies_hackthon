import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("promptothon_token") || localStorage.getItem("token");
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (typeof window !== "undefined") {
      if (response.data?.token) {
        localStorage.setItem("promptothon_token", response.data.token);
      }
      if (response.config?.url?.includes("/api/auth/logout")) {
        localStorage.removeItem("promptothon_token");
        localStorage.removeItem("token");
      }
    }
    return response;
  },
  (error) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      if (error.config?.url?.includes("/api/auth/me")) {
        localStorage.removeItem("promptothon_token");
        localStorage.removeItem("token");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
