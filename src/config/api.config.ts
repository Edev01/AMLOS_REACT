/**
 * Centralized API Configuration
 * This is the single source of truth for all API endpoints.
 * No component should ever write URL strings manually.
 */

// Base URL - clean, no trailing slash
export const BASE_URL = 'https://amlos-backend.onrender.com';

// API Endpoints - all with trailing slashes for Django compatibility
export const ENDPOINTS = {
  // Authentication
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout/',
  REFRESH: '/api/auth/refresh/',
  
  // User Management
  USERS: '/api/users/',
  USER_PROFILE: '/api/users/profile/',
  
  // Schools & Campuses
  SCHOOLS: '/api/schools/',
  CAMPUSES: '/api/campuses/',
  CAMPUS_DETAIL: (id: string) => `/api/campuses/${id}/`,
  
  // Dashboard
  DASHBOARD: '/api/dashboard/',
  CAMPUS_DASHBOARD: (campusId: string) => `/api/campuses/${campusId}/dashboard/`,
  
  // Students & Teachers
  STUDENTS: '/api/students/',
  TEACHERS: '/api/teachers/',
  
  // Academic
  CLASSES: '/api/classes/',
  SUBJECTS: '/api/subjects/',
  CURRICULUM: '/api/curriculum/',
  
  // Content & Assessments
  CONTENT: '/api/content/',
  QUIZZES: '/api/quizzes/',
  PLANNERS: '/api/planners/',
  
  // Analytics
  ANALYTICS: '/api/analytics/',
  REPORTS: '/api/reports/',
} as const;

// Helper to build full URL (for debugging/logging)
export const buildFullUrl = (endpoint: string): string => {
  return `${BASE_URL}${endpoint}`;
};

// Ensure endpoint has trailing slash for Django
export const ensureTrailingSlash = (url: string): string => {
  return url.endsWith('/') ? url : `${url}/`;
};

// API Version
export const API_VERSION = 'v1';
