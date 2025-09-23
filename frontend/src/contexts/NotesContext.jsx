import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { apiEndpoints, apiUtils } from '../utils/api';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  notes: [],
  currentNote: null,
  isLoading: false,
  error: null,
  searchResults: [],
  isSearching: false,
  filters: {
    status: 'all',
    category: 'all',
    tags: [],
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  stats: {
    totalNotes: 0,
    totalWords: 0,
    notesByStatus: {},
  },
};

// Action types
const NOTES_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_SEARCHING: 'SET_SEARCHING',
  SET_NOTES: 'SET_NOTES',
  ADD_NOTE: 'ADD_NOTE',
  UPDATE_NOTE: 'UPDATE_NOTE',
  DELETE_NOTE: 'DELETE_NOTE',
  SET_CURRENT_NOTE: 'SET_CURRENT_NOTE',
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  SET_FILTERS: 'SET_FILTERS',
  SET_PAGINATION: 'SET_PAGINATION',
  SET_STATS: 'SET_STATS',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  RESET_STATE: 'RESET_STATE',
};

// Reducer
const notesReducer = (state, action) => {
  switch (action.type) {
    case NOTES_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case NOTES_ACTIONS.SET_SEARCHING:
      return { ...state, isSearching: action.payload };
    case NOTES_ACTIONS.SET_NOTES:
      return { 
        ...state, 
        notes: action.payload,
        isLoading: false,
        error: null,
      };
    case NOTES_ACTIONS.ADD_NOTE:
      return {
        ...state,
        notes: [action.payload, ...state.notes],
        stats: {
          ...state.stats,
          totalNotes: state.stats.totalNotes + 1,
        },
      };
    case NOTES_ACTIONS.UPDATE_NOTE:
      return {
        ...state,
        notes: state.notes.map(note => 
          note._id === action.payload._id ? action.payload : note
        ),
        currentNote: state.currentNote?._id === action.payload._id 
          ? action.payload 
          : state.currentNote,
      };
    case NOTES_ACTIONS.DELETE_NOTE:
      return {
        ...state,
        notes: state.notes.filter(note => note._id !== action.payload),
        currentNote: state.currentNote?._id === action.payload 
          ? null 
          : state.currentNote,
        stats: {
          ...state.stats,
          totalNotes: Math.max(0, state.stats.totalNotes - 1),
        },
      };
    case NOTES_ACTIONS.SET_CURRENT_NOTE:
      return { ...state, currentNote: action.payload };
    case NOTES_ACTIONS.SET_SEARCH_RESULTS:
      return { 
        ...state, 
        searchResults: action.payload,
        isSearching: false,
      };
    case NOTES_ACTIONS.SET_FILTERS:
      return { 
        ...state, 
        filters: { ...state.filters, ...action.payload },
      };
    case NOTES_ACTIONS.SET_PAGINATION:
      return { 
        ...state, 
        pagination: { ...state.pagination, ...action.payload },
      };
    case NOTES_ACTIONS.SET_STATS:
      return { ...state, stats: action.payload };
    case NOTES_ACTIONS.SET_ERROR:
      return { 
        ...state, 
        error: action.payload,
        isLoading: false,
        isSearching: false,
      };
    case NOTES_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    case NOTES_ACTIONS.RESET_STATE:
      return initialState;
    default:
      return state;
  }
};

// Create context
const NotesContext = createContext();

// Provider component
export const NotesProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notesReducer, initialState);

  // Fetch notes
  const fetchNotes = useCallback(async (params = {}) => {
    try {
      dispatch({ type: NOTES_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: NOTES_ACTIONS.CLEAR_ERROR });

      const queryParams = {
        page: state.pagination.page,
        limit: state.pagination.limit,
        sortBy: state.filters.sortBy,
        sortOrder: state.filters.sortOrder,
        ...params,
      };

      // Add filters
      if (state.filters.status !== 'all') {
        queryParams.status = state.filters.status;
      }
      if (state.filters.category !== 'all') {
        queryParams.category = state.filters.category;
      }
      if (state.filters.tags.length > 0) {
        queryParams.tags = state.filters.tags.join(',');
      }

      const response = await apiEndpoints.notes.getAll(queryParams);
      
      dispatch({ type: NOTES_ACTIONS.SET_NOTES, payload: response.data.notes });
      dispatch({ 
        type: NOTES_ACTIONS.SET_PAGINATION, 
        payload: {
          page: response.data.pagination.page,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages,
        }
      });

      return { success: true, data: response.data };
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      dispatch({ type: NOTES_ACTIONS.SET_ERROR, payload: errorInfo.message });
      return { success: false, error: errorInfo.message };
    }
  }, [state.pagination.page, state.pagination.limit, state.filters]);

  // Create note
  const createNote = async (noteData) => {
    try {
      const response = await apiEndpoints.notes.create(noteData);
      dispatch({ type: NOTES_ACTIONS.ADD_NOTE, payload: response.data });
      toast.success('Note created successfully');
      return { success: true, data: response.data };
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      toast.error(errorInfo.message);
      return { success: false, error: errorInfo.message };
    }
  };

  // Update note
  const updateNote = async (noteId, noteData) => {
    try {
      const response = await apiEndpoints.notes.update(noteId, noteData);
      dispatch({ type: NOTES_ACTIONS.UPDATE_NOTE, payload: response.data });
      toast.success('Note updated successfully');
      return { success: true, data: response.data };
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      toast.error(errorInfo.message);
      return { success: false, error: errorInfo.message };
    }
  };

  // Delete note
  const deleteNote = async (noteId) => {
    try {
      await apiEndpoints.notes.delete(noteId);
      dispatch({ type: NOTES_ACTIONS.DELETE_NOTE, payload: noteId });
      toast.success('Note deleted successfully');
      return { success: true };
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      toast.error(errorInfo.message);
      return { success: false, error: errorInfo.message };
    }
  };

  // Get note by ID
  const getNoteById = async (noteId) => {
    try {
      dispatch({ type: NOTES_ACTIONS.SET_LOADING, payload: true });
      const response = await apiEndpoints.notes.getById(noteId);
      dispatch({ type: NOTES_ACTIONS.SET_CURRENT_NOTE, payload: response.data });
      dispatch({ type: NOTES_ACTIONS.SET_LOADING, payload: false });
      return { success: true, data: response.data };
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      dispatch({ type: NOTES_ACTIONS.SET_ERROR, payload: errorInfo.message });
      return { success: false, error: errorInfo.message };
    }
  };

  // Search notes
  const searchNotes = async (query, params = {}) => {
    try {
      dispatch({ type: NOTES_ACTIONS.SET_SEARCHING, payload: true });
      const response = await apiEndpoints.notes.search(query, params);
      dispatch({ type: NOTES_ACTIONS.SET_SEARCH_RESULTS, payload: response.data });
      return { success: true, data: response.data };
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      dispatch({ type: NOTES_ACTIONS.SET_ERROR, payload: errorInfo.message });
      return { success: false, error: errorInfo.message };
    }
  };

  // Get notes statistics
  const fetchStats = async () => {
    try {
      const response = await apiEndpoints.notes.getStats();
      dispatch({ type: NOTES_ACTIONS.SET_STATS, payload: response.data });
      return { success: true, data: response.data };
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      return { success: false, error: errorInfo.message };
    }
  };

  // Set filters
  const setFilters = (filters) => {
    dispatch({ type: NOTES_ACTIONS.SET_FILTERS, payload: filters });
  };

  // Set pagination
  const setPagination = (pagination) => {
    dispatch({ type: NOTES_ACTIONS.SET_PAGINATION, payload: pagination });
  };

  // Set current note
  const setCurrentNote = (note) => {
    dispatch({ type: NOTES_ACTIONS.SET_CURRENT_NOTE, payload: note });
  };

  // Clear search results
  const clearSearchResults = () => {
    dispatch({ type: NOTES_ACTIONS.SET_SEARCH_RESULTS, payload: [] });
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: NOTES_ACTIONS.CLEAR_ERROR });
  };

  // Reset state
  const resetState = () => {
    dispatch({ type: NOTES_ACTIONS.RESET_STATE });
  };

  // Share note
  const shareNote = async (noteId, shareData) => {
    try {
      const response = await apiEndpoints.notes.share(noteId, shareData);
      dispatch({ type: NOTES_ACTIONS.UPDATE_NOTE, payload: response.data });
      toast.success('Note shared successfully');
      return { success: true, data: response.data };
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      toast.error(errorInfo.message);
      return { success: false, error: errorInfo.message };
    }
  };

  // Unshare note
  const unshareNote = async (noteId) => {
    try {
      const response = await apiEndpoints.notes.unshare(noteId);
      dispatch({ type: NOTES_ACTIONS.UPDATE_NOTE, payload: response.data });
      toast.success('Note unshared successfully');
      return { success: true, data: response.data };
    } catch (error) {
      const errorInfo = apiUtils.handleError(error);
      toast.error(errorInfo.message);
      return { success: false, error: errorInfo.message };
    }
  };

  const value = {
    // State
    ...state,
    
    // Actions
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    getNoteById,
    searchNotes,
    fetchStats,
    setFilters,
    setPagination,
    setCurrentNote,
    clearSearchResults,
    clearError,
    resetState,
    shareNote,
    unshareNote,
    
    // Computed values
    filteredNotes: state.notes.filter(note => {
      if (state.filters.status !== 'all' && note.status !== state.filters.status) {
        return false;
      }
      if (state.filters.category !== 'all' && note.category !== state.filters.category) {
        return false;
      }
      if (state.filters.tags.length > 0) {
        const hasMatchingTag = state.filters.tags.some(tag => 
          note.tags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }
      return true;
    }),
    
    hasNotes: state.notes.length > 0,
    hasSearchResults: state.searchResults.length > 0,
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
};

// Hook to use notes context
export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};

export default NotesContext;
