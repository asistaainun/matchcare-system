import React, { createContext, useContext, useReducer, useEffect } from 'react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import api from '../services/api';

// Initial state
const initialState = {
  user: null,
  profile: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
};

// Action types
const AUTH_ACTIONS = {
  AUTH_START: 'AUTH_START',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILURE: 'AUTH_FAILURE',
  LOGOUT: 'LOGOUT',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.AUTH_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };
    
    case AUTH_ACTIONS.AUTH_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        profile: action.payload.profile || null,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    
    case AUTH_ACTIONS.AUTH_FAILURE:
      return {
        ...state,
        user: null,
        profile: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false
      };
    
    case AUTH_ACTIONS.UPDATE_PROFILE:
      return {
        ...state,
        profile: action.payload
      };
    
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = Cookies.get('authToken');
      
      if (token) {
        try {
          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Fetch user profile
          const response = await api.get('/users/profile');
          
          dispatch({
            type: AUTH_ACTIONS.AUTH_SUCCESS,
            payload: {
              user: response.data.data.user,
              profile: response.data.data.profile,
              token
            }
          });
        } catch (error) {
          console.error('Token validation failed:', error);
          // Remove invalid token
          Cookies.remove('authToken');
          delete api.defaults.headers.common['Authorization'];
          
          dispatch({
            type: AUTH_ACTIONS.AUTH_FAILURE,
            payload: 'Session expired. Please login again.'
          });
        }
      } else {
        dispatch({
          type: AUTH_ACTIONS.AUTH_FAILURE,
          payload: null
        });
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.AUTH_START });
    
    try {
      const response = await api.post('/users/login', { email, password });
      const { user, profile, token } = response.data.data;
      
      // Store token in cookie (secure, httpOnly would be better for production)
      Cookies.set('authToken', token, { 
        expires: 30, // 30 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      // Set token in API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      dispatch({
        type: AUTH_ACTIONS.AUTH_SUCCESS,
        payload: { user, profile, token }
      });
      
      toast.success(`Welcome back, ${user.firstName}!`);
      return { success: true, user, profile };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      
      dispatch({
        type: AUTH_ACTIONS.AUTH_FAILURE,
        payload: errorMessage
      });
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Register function
  const register = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.AUTH_START });
    
    try {
      const response = await api.post('/users/register', userData);
      const { user, token } = response.data.data;
      
      // Store token in cookie
      Cookies.set('authToken', token, { 
        expires: 30,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      // Set token in API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      dispatch({
        type: AUTH_ACTIONS.AUTH_SUCCESS,
        payload: { user, profile: null, token }
      });
      
      toast.success(`Welcome to MatchCare, ${user.firstName}!`);
      return { success: true, user };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      
      dispatch({
        type: AUTH_ACTIONS.AUTH_FAILURE,
        payload: errorMessage
      });
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = () => {
    // Remove token from cookie
    Cookies.remove('authToken');
    
    // Remove token from API headers
    delete api.defaults.headers.common['Authorization'];
    
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
    
    toast.success('Logged out successfully');
  };

  // Update profile function
  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/users/profile', profileData);
      const { user } = response.data.data;
      
      dispatch({
        type: AUTH_ACTIONS.UPDATE_PROFILE,
        payload: user
      });
      
      toast.success('Profile updated successfully');
      return { success: true, user };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Submit quiz (for logged-in users)
  const submitQuiz = async (responses) => {
    try {
      const response = await api.post('/quiz/submit', { responses });
      const { profile } = response.data.data;
      
      dispatch({
        type: AUTH_ACTIONS.UPDATE_PROFILE,
        payload: profile
      });
      
      toast.success('Quiz submitted successfully!');
      return { success: true, profile };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Quiz submission failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Add to favorites
  const addToFavorites = async (productId) => {
    try {
      await api.post('/users/favorites', { productId });
      toast.success('Added to favorites!');
      return { success: true };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to add to favorites';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Remove from favorites
  const removeFromFavorites = async (productId) => {
    try {
      await api.delete(`/users/favorites/${productId}`);
      toast.success('Removed from favorites');
      return { success: true };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to remove from favorites';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Context value
  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    submitQuiz,
    addToFavorites,
    removeFromFavorites,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};