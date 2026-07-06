// Support both build-time and runtime environment variables
// In production with Docker: window._env_.API_URL is set by entrypoint.sh
// In development: VITE_API_URL is set during build
const API_BASE_URL = window._env_?.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Custom fetch wrapper to interact with the backend API
 * Handles base URL configuration and credentials (sharing cookies)
 */
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Set credentials to 'include' so httpOnly cookies are shared across domains
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  // Stringify body if it is an object
  if (options.body && typeof options.body === 'object') {
    defaultOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, defaultOptions);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error(`API Call failed for ${endpoint}:`, error.message);
    throw error;
  }
};
