import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const cleanBaseUrl = rawApiUrl.replace(/\/+$/, '');
const API_BASE_URL = cleanBaseUrl.endsWith('/api') ? cleanBaseUrl : `${cleanBaseUrl}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 90000, // 90 seconds (under Render's 100s proxy cut-off)
});

// Request interceptor to attach JWT token and correlation tracking
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('doera_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach correlation request ID for distributed tracing
    if (!config.headers['X-Request-Id']) {
      config.headers['X-Request-Id'] = `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with bounded retry for safe GET operations
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Handle 401 unauthorized
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('doera_token');
      localStorage.removeItem('doera_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Safe retry for idempotent GET requests on transient network/proxy drops (502, 503, 504)
    const isGet = config && config.method && config.method.toLowerCase() === 'get';
    const isTransient = !error.response || [502, 503, 504].includes(error.response?.status);

    if (isGet && isTransient && (!config._retryCount || config._retryCount < 2)) {
      config._retryCount = (config._retryCount || 0) + 1;
      const delayMs = config._retryCount * 1000 + Math.floor(Math.random() * 500);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;
