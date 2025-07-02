import React, { createContext, useContext, useReducer, useEffect } from 'react';
import toast from 'react-hot-toast';
import { apiMethods } from '../services/api';

// Initial state
const initialState = {
  sessionId: null,
  profile: null,
  viewedProducts: [],
  preferences: {
    avoidedIngredients: [],
    preferredIngredients: [],
    skinConcerns: [],
    knownSensitivities: []
  },
  isLoading: true,
  error: null
};

// Action types
const GUEST_ACTIONS = {
  SESSION_START: 'SESSION_START',
  SESSION_SUCCESS: 'SESSION_SUCCESS',
  SESSION_FAILURE: 'SESSION_FAILURE',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES',
  ADD_VIEWED_PRODUCT: 'ADD_VIEWED_PRODUCT',
  CLEAR_SESSION: 'CLEAR_SESSION',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer
const guestReducer = (state, action) => {
  switch (action.type) {
    case GUEST_ACTIONS.SESSION_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };
    
    case GUEST_ACTIONS.SESSION_SUCCESS:
      return {
        ...state,
        sessionId: action.payload.sessionId,
        profile: action.payload.profile || null,
        viewedProducts: action.payload.viewedProducts || [],
        preferences: action.payload.preferences || state.preferences,
        isLoading: false,
        error: null
      };
    
    case GUEST_ACTIONS.SESSION_FAILURE:
      return {
        ...state,
        sessionId: null,
        profile: null,
        isLoading: false,
        error: action.payload
      };
    
    case GUEST_ACTIONS.UPDATE_PROFILE:
      return {
        ...state,
        profile: action.payload
      };
    
    case GUEST_ACTIONS.UPDATE_PREFERENCES:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload
        }
      };
    
    case GUEST_ACTIONS.ADD_VIEWED_PRODUCT:
      const productId = action.payload;
      const updatedViewedProducts = state.viewedProducts.includes(productId)
        ? state.viewedProducts
        : [...state.viewedProducts, productId];
      
      return {
        ...state,
        viewedProducts: updatedViewedProducts
      };
    
    case GUEST_ACTIONS.CLEAR_SESSION:
      return {
        ...initialState,
        isLoading: false
      };
    
    case GUEST_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    default:
      return state;
  }
};

// Create context
const GuestContext = createContext();

// Hook to use guest context
export const useGuest = () => {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
};

// Guest Provider component
export const GuestProvider = ({ children }) => {
  const [state, dispatch] = useReducer(guestReducer, initialState);

  // Initialize or retrieve guest session on mount
  useEffect(() => {
    const initializeGuestSession = async () => {
      const existingSessionId = localStorage.getItem('guestSessionId');
      
      if (existingSessionId) {
        try {
          // Try to retrieve existing session
          const response = await apiMethods.guest.getSession(existingSessionId);
          
          dispatch({
            type: GUEST_ACTIONS.SESSION_SUCCESS,
            payload: {
              sessionId: existingSessionId,
              profile: response.data.data.profile,
              viewedProducts: response.data.data.viewedProducts || [],
              preferences: response.data.data.preferences
            }
          });
        } catch (error) {
          console.error('Failed to retrieve guest session:', error);
          // Create new session if existing one is invalid
          await createNewSession();
        }
      } else {
        // Create new session
        await createNewSession();
      }
    };

    const createNewSession = async () => {
      try {
        dispatch({ type: GUEST_ACTIONS.SESSION_START });
        
        const response = await apiMethods.guest.createSession();
        const { sessionId, expiresAt } = response.data.data;
        
        // Store session ID in localStorage
        localStorage.setItem('guestSessionId', sessionId);
        localStorage.setItem('guestSessionExpiry', expiresAt);
        
        dispatch({
          type: GUEST_ACTIONS.SESSION_SUCCESS,
          payload: {
            sessionId,
            profile: null,
            viewedProducts: [],
            preferences: initialState.preferences
          }
        });
      } catch (error) {
        console.error('Failed to create guest session:', error);
        dispatch({
          type: GUEST_ACTIONS.SESSION_FAILURE,
          payload: 'Failed to initialize guest session'
        });
      }
    };

    initializeGuestSession();
  }, []);

  // Check session expiry periodically
  useEffect(() => {
    const checkSessionExpiry = () => {
      const expiryTime = localStorage.getItem('guestSessionExpiry');
      if (expiryTime && new Date(expiryTime) < new Date()) {
        clearSession();
      }
    };

    const interval = setInterval(checkSessionExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Submit quiz for guest
  const submitQuiz = async (responses) => {
    if (!state.sessionId) {
      throw new Error('No active guest session');
    }

    try {
      const response = await apiMethods.guest.submitQuiz(state.sessionId, responses);
      const { profile } = response.data.data;
      
      dispatch({
        type: GUEST_ACTIONS.UPDATE_PROFILE,
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

  // Update preferences
  const updatePreferences = async (preferences) => {
    if (!state.sessionId) {
      throw new Error('No active guest session');
    }

    try {
      await apiMethods.guest.updatePreferences(state.sessionId, preferences);
      
      dispatch({
        type: GUEST_ACTIONS.UPDATE_PREFERENCES,
        payload: preferences
      });
      
      toast.success('Preferences updated!');
      return { success: true };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update preferences';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Add viewed product
  const addViewedProduct = async (productId) => {
    if (!state.sessionId || !productId) return;

    try {
      await apiMethods.guest.addViewedProduct(state.sessionId, productId);
      
      dispatch({
        type: GUEST_ACTIONS.ADD_VIEWED_PRODUCT,
        payload: productId
      });
      
    } catch (error) {
      console.error('Failed to track viewed product:', error);
      // Don't show error to user for tracking failures
    }
  };

  // Convert guest session to user account
  const convertToUser = async (userData) => {
    if (!state.sessionId) {
      throw new Error('No active guest session');
    }

    try {
      const response = await apiMethods.guest.convertToUser(state.sessionId, userData);
      const { user, profile, token } = response.data.data;
      
      // Clear guest session
      clearSession();
      
      toast.success(`Welcome to MatchCare, ${user.firstName}!`);
      return { success: true, user, profile, token };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Account creation failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Get guest recommendations
  const getRecommendations = async (params = {}) => {
    if (!state.sessionId) {
      throw new Error('No active guest session');
    }

    try {
      const response = await apiMethods.guest.getRecommendations(state.sessionId, params);
      return response.data.data;
      
    } catch (error) {
      console.error('Failed to get guest recommendations:', error);
      throw error;
    }
  };

  // Clear session
  const clearSession = () => {
    localStorage.removeItem('guestSessionId');
    localStorage.removeItem('guestSessionExpiry');
    
    dispatch({ type: GUEST_ACTIONS.CLEAR_SESSION });
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: GUEST_ACTIONS.CLEAR_ERROR });
  };

  // Add ingredient to avoided list
  const addAvoidedIngredient = async (ingredient) => {
    const currentAvoided = state.preferences.avoidedIngredients || [];
    if (currentAvoided.includes(ingredient)) return;

    const newPreferences = {
      avoidedIngredients: [...currentAvoided, ingredient]
    };

    return updatePreferences(newPreferences);
  };

  // Remove ingredient from avoided list
  const removeAvoidedIngredient = async (ingredient) => {
    const currentAvoided = state.preferences.avoidedIngredients || [];
    const newPreferences = {
      avoidedIngredients: currentAvoided.filter(item => item !== ingredient)
    };

    return updatePreferences(newPreferences);
  };

  // Add ingredient to preferred list
  const addPreferredIngredient = async (ingredient) => {
    const currentPreferred = state.preferences.preferredIngredients || [];
    if (currentPreferred.includes(ingredient)) return;

    const newPreferences = {
      preferredIngredients: [...currentPreferred, ingredient]
    };

    return updatePreferences(newPreferences);
  };

  // Remove ingredient from preferred list
  const removePreferredIngredient = async (ingredient) => {
    const currentPreferred = state.preferences.preferredIngredients || [];
    const newPreferences = {
      preferredIngredients: currentPreferred.filter(item => item !== ingredient)
    };

    return updatePreferences(newPreferences);
  };

  // Update skin concerns
  const updateSkinConcerns = async (concerns) => {
    const newPreferences = {
      skinConcerns: concerns
    };

    return updatePreferences(newPreferences);
  };

  // Update known sensitivities
  const updateKnownSensitivities = async (sensitivities) => {
    const newPreferences = {
      knownSensitivities: sensitivities
    };

    return updatePreferences(newPreferences);
  };

  // Get session info
  const getSessionInfo = () => {
    return {
      sessionId: state.sessionId,
      hasProfile: !!state.profile,
      profileCompleteness: state.profile?.profileCompleteness || 0,
      viewedProductsCount: state.viewedProducts.length,
      expiresAt: localStorage.getItem('guestSessionExpiry')
    };
  };

  // Context value
  const value = {
    ...state,
    submitQuiz,
    updatePreferences,
    addViewedProduct,
    convertToUser,
    getRecommendations,
    clearSession,
    clearError,
    addAvoidedIngredient,
    removeAvoidedIngredient,
    addPreferredIngredient,
    removePreferredIngredient,
    updateSkinConcerns,
    updateKnownSensitivities,
    getSessionInfo
  };

  return (
    <GuestContext.Provider value={value}>
      {children}
    </GuestContext.Provider>
  );
};