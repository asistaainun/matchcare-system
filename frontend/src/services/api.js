import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    config.params = {
      ...config.params,
      _t: Date.now()
    };
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          if (window.location.pathname !== '/login') {
            toast.error('Please log in to continue');
            window.location.href = '/login';
          }
          break;
        case 403:
          toast.error('Access denied');
          break;
        case 404:
          toast.error('Resource not found');
          break;
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          if (data?.message) {
            toast.error(data.message);
          }
      }
    } else if (error.request) {
      // Network error
      toast.error('Network error. Please check your connection.');
    } else {
      // Other error
      toast.error('An unexpected error occurred.');
    }
    
    return Promise.reject(error);
  }
);

// API methods organized by feature
export const apiMethods = {
  // Authentication
  auth: {
    login: (credentials) => api.post('/api/users/login', credentials),
    register: (userData) => api.post('/api/users/register', userData),
    getProfile: () => api.get('/api/users/profile'),
    updateProfile: (data) => api.put('/api/users/profile', data),
    logout: () => api.post('/api/users/logout')
  },

  // Products
  products: {
    getAll: (params = {}) => api.get('/api/products', { params }),
    getById: (id, params = {}) => api.get(`/api/products/${id}`, { params }),
    search: (data) => api.post('/api/products/search', data),
    getCategories: () => api.get('/api/products/categories'),
    getBrands: () => api.get('/api/products/brands'),
    getRecommendations: (userId, params = {}) => 
      api.get(`/api/products/recommendations/${userId}`, { params })
  },

  // Ingredients
  ingredients: {
    getAll: (params = {}) => api.get('/api/ingredients', { params }),
    getById: (id, params = {}) => api.get(`/api/ingredients/${id}`, { params }),
    search: (data) => api.post('/api/ingredients/search', data),
    getCategories: () => api.get('/api/ingredients/categories'),
    getKeyIngredients: () => api.get('/api/ingredients/key-ingredients')
  },

  // Quiz
  quiz: {
    getQuestions: () => api.get('/api/quiz/questions'),
    submit: (responses) => api.post('/api/quiz/submit', { responses }),
    getHistory: () => api.get('/api/quiz/history')
  },

  // Favorites
  favorites: {
    get: () => api.get('/api/users/favorites'),
    add: (productId) => api.post('/api/users/favorites', { productId }),
    remove: (productId) => api.delete(`/api/users/favorites/${productId}`)
  },

  // Recommendations
  recommendations: {
    getPersonalized: (userId, params = {}) => 
      api.get(`/api/recommendations/user/${userId}`, { params }),
    getRoutine: (userId) => api.get(`/api/recommendations/routine/${userId}`),
    getSimilar: (productId, params = {}) => 
      api.get(`/api/recommendations/similar/${productId}`, { params }),
    getTrending: (params = {}) => api.get('/api/recommendations/trending', { params })
  },

  // Guest
  guest: {
    createSession: () => api.post('/api/guest/session'),
    getSession: (sessionId) => api.get(`/api/guest/session/${sessionId}`),
    submitQuiz: (sessionId, responses) => 
      api.post(`/api/guest/quiz/${sessionId}`, { responses }),
    updatePreferences: (sessionId, preferences) => 
      api.put(`/api/guest/preferences/${sessionId}`, preferences),
    addViewedProduct: (sessionId, productId) => 
      api.post(`/api/guest/viewed/${sessionId}`, { productId }),
    convertToUser: (sessionId, userData) => 
      api.post(`/api/guest/convert/${sessionId}`, userData),
    getRecommendations: (sessionId, params = {}) => 
      api.get(`/api/guest/recommendations/${sessionId}`, { params })
  },

  // Health check
  health: {
    check: () => api.get('/api/health'),
    images: () => api.get('/api/health/images')
  }
};

// Utility functions
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const uploadFile = async (file, endpoint, onProgress = () => {}) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgress(percentCompleted);
    },
  });
};

// Cache management
export const cacheConfig = {
  // Short cache for frequently changing data
  short: { cacheTime: 5 * 60 * 1000, staleTime: 1 * 60 * 1000 }, // 5min cache, 1min stale
  
  // Medium cache for moderately changing data
  medium: { cacheTime: 30 * 60 * 1000, staleTime: 10 * 60 * 1000 }, // 30min cache, 10min stale
  
  // Long cache for rarely changing data
  long: { cacheTime: 60 * 60 * 1000, staleTime: 30 * 60 * 1000 }, // 1hour cache, 30min stale
};

// Error handling utilities
export const handleApiError = (error, fallbackMessage = 'An error occurred') => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return fallbackMessage;
};

export const isNetworkError = (error) => {
  return !error.response && error.request;
};

export const getErrorStatus = (error) => {
  return error.response?.status || null;
};

// Request helpers
export const createQueryString = (params) => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, item));
      } else {
        searchParams.append(key, value);
      }
    }
  });
  
  return searchParams.toString();
};

export default api;