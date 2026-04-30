/**
 * API Services - Re-export from centralized axios instance
 * For new code, import directly from '../api/axios' or use the API config
 * 
 * @deprecated Use '../api/axios' instead for new code
 */

// Re-export everything from the new centralized axios instance
export { 
  default, 
  default as api,
  setAuthToken, 
  clearAllAuthData 
} from '../axios';