import axios from 'axios';
import Cookies from 'js-cookie';

// API base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add tenant context if available
    const tenantSlug = Cookies.get('tenantSlug') || localStorage.getItem('tenantSlug');
    if (tenantSlug) {
      config.headers['X-Tenant-Slug'] = tenantSlug;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data on unauthorized
      Cookies.remove('authToken');
      Cookies.remove('tenantSlug');
      localStorage.removeItem('user');
      localStorage.removeItem('tenantSlug');
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const apiEndpoints = {
  // Health check
  health: () => api.get('/health'),
  
  // Authentication
  auth: {
    login: (credentials) => api.post('/api/auth/login', credentials),
    register: (userData) => api.post('/api/auth/register', userData),
    logout: () => api.post('/api/auth/logout'),
    getCurrentUser: () => api.get('/api/auth/me'),
    refreshToken: (refreshToken) => api.post('/api/auth/refresh', { refreshToken }),
  },
  
  // Tenant management
  tenants: {
    getCurrent: () => api.get('/api/tenants/current'),
    upgrade: (slug) => api.post(`/api/tenants/${slug}/upgrade`),
    getUsage: () => api.get('/api/tenants/usage'),
  },
  
  // User management
  users: {
    getProfile: () => api.get('/api/users/profile'),
    updateProfile: (profileData) => api.put('/api/users/profile', profileData),
    changePassword: (passwordData) => api.put('/api/users/change-password', passwordData),
    updatePreferences: (preferences) => api.put('/api/users/preferences', preferences),
    inviteUser: (inviteData) => api.post('/api/users/invite', inviteData),
    removeUser: (userId) => api.delete(`/api/users/${userId}`),
    updateUserRole: (userId, role) => api.put(`/api/users/${userId}/role`, { role }),
  },
  
  // Notes management
  notes: {
    getAll: (params = {}) => api.get('/api/notes', { params }),
    getById: (id) => api.get(`/api/notes/${id}`),
    create: (noteData) => api.post('/api/notes', noteData),
    update: (id, noteData) => api.put(`/api/notes/${id}`, noteData),
    delete: (id) => api.delete(`/api/notes/${id}`),
    search: (query, params = {}) => api.get('/api/notes/search', { params: { q: query, ...params } }),
    getStats: () => api.get('/api/notes/stats'),
  },
  
  // Categories and tags
  categories: {
    getAll: () => api.get('/api/categories'),
    create: (categoryData) => api.post('/api/categories', categoryData),
    update: (id, categoryData) => api.put(`/api/categories/${id}`, categoryData),
    delete: (id) => api.delete(`/api/categories/${id}`),
  },
  
  tags: {
    getAll: () => api.get('/api/tags'),
    getPopular: () => api.get('/api/tags/popular'),
  },
  
  // File uploads
  uploads: {
    uploadFile: (file, onProgress) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return api.post('/api/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      });
    },
    deleteFile: (fileId) => api.delete(`/api/uploads/${fileId}`),
  },
};

// Utility functions
export const apiUtils = {
  // Handle API errors
  handleError: (error) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.data?.error || 'An error occurred';
      return {
        message,
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      // Request made but no response received
      return {
        message: 'Network error. Please check your connection.',
        status: 0,
        data: null,
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unexpected error occurred',
        status: -1,
        data: null,
      };
    }
  },
  
  // Format API response
  formatResponse: (response) => {
    return {
      data: response.data,
      status: response.status,
      headers: response.headers,
    };
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    return !!Cookies.get('authToken');
  },
  
  // Get current tenant slug
  getCurrentTenantSlug: () => {
    return Cookies.get('tenantSlug') || localStorage.getItem('tenantSlug');
  },
  
  // Set authentication data
  setAuthData: (token, user, tenantSlug) => {
    Cookies.set('authToken', token, { expires: 7, secure: true, sameSite: 'strict' });
    Cookies.set('tenantSlug', tenantSlug, { expires: 7, secure: true, sameSite: 'strict' });
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('tenantSlug', tenantSlug);
  },
  
  // Clear authentication data
  clearAuthData: () => {
    Cookies.remove('authToken');
    Cookies.remove('tenantSlug');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantSlug');
  },
  
  // Get stored user data
  getStoredUser: () => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  },
};

export default api;
