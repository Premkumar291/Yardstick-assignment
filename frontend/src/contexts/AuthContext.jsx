import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { apiEndpoints, apiUtils } from '../utils/api';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
  UPDATE_TENANT: 'UPDATE_TENANT',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        tenant: action.payload.tenant,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
      };
    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    case AUTH_ACTIONS.UPDATE_TENANT:
      return {
        ...state,
        tenant: { ...state.tenant, ...action.payload },
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (!apiUtils.isAuthenticated()) {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        return;
      }

      // Try to get current user to verify token validity
      const response = await apiEndpoints.auth.getCurrentUser();
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: response.data.user,
          tenant: response.data.tenant,
        },
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid auth data
      apiUtils.clearAuthData();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await apiEndpoints.auth.login(credentials);
      const { user, tenant, tokens } = response.data;

      // Store auth data
      apiUtils.setAuthData(tokens.accessToken, user, tenant.slug);

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, tenant },
      });

      toast.success(`Welcome back, ${user.fullName || user.email}!`);
      return { success: true, data: { user, tenant } };
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorInfo.message });
      toast.error(errorInfo.message);
      return { success: false, error: errorInfo.message };
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await apiEndpoints.auth.register(userData);
      const { user, tenant, tokens } = response.data;

      // Store auth data
      apiUtils.setAuthData(tokens.accessToken, user, tenant.slug);

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, tenant },
      });

      toast.success('Account created successfully!');
      return { success: true, data: { user, tenant } };
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorInfo.message });
      toast.error(errorInfo.message);
      return { success: false, error: errorInfo.message };
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to invalidate token on server
      await apiEndpoints.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear auth data regardless of server response
      apiUtils.clearAuthData();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      toast.success('Logged out successfully');
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await apiEndpoints.users.updateProfile(profileData);
      dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: response.data });
      toast.success('Profile updated successfully');
      return { success: true, data: response.data };
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      toast.error(errorInfo.message);
      return { success: false, error: errorInfo.message };
    }
  };

  const changePassword = async (passwordData) => {
    try {
      await apiEndpoints.users.changePassword(passwordData);
      toast.success('Password changed successfully');
      return { success: true };
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      toast.error(errorInfo.message);
      return { success: false, error: errorInfo.message };
    }
  };

  const forgotPassword = async (email) => {
    try {
      await apiEndpoints.auth.forgotPassword(email);
      toast.success('Password reset email sent');
      return { success: true };
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      toast.error(errorInfo.message);
      return { success: false, error: errorInfo.message };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      await apiEndpoints.auth.resetPassword(token, password);
      toast.success('Password reset successfully');
      return { success: true };
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      toast.error(errorInfo.message);
      return { success: false, error: errorInfo.message };
    }
  };

  const updateTenantSettings = async (settings) => {
    try {
      const response = await apiEndpoints.tenants.updateSettings(settings);
      dispatch({ type: AUTH_ACTIONS.UPDATE_TENANT, payload: response.data });
      toast.success('Settings updated successfully');
      return { success: true, data: response.data };
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      toast.error(errorInfo.message);
      return { success: false, error: errorInfo.message };
    }
  };

  const refreshAuth = async () => {
    try {
      await checkAuthStatus();
    } catch (error) {
      console.error('Failed to refresh auth:', error);
    }
  };

  const value = {
    // State
    ...state,
    
    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    updateTenantSettings,
    refreshAuth,
    clearError: () => dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR }),
    
    // Computed values
    isAdmin: state.user?.role === 'admin',
    canManageUsers: state.user?.permissions?.canManageUsers || state.user?.role === 'admin',
    canManageTenant: state.user?.permissions?.canManageTenant || state.user?.role === 'admin',
    tenantSlug: state.tenant?.slug,
    userFullName: state.user?.fullName || state.user?.email?.split('@')[0] || 'User',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export the context for advanced usage if needed
export { AuthContext };
