/**
 * =============================================================================
 * API Configuration
 * =============================================================================
 * 
 * Centralized API configuration for frontend-backend communication.
 * This file contains all API endpoints and configuration settings.
 */

// API Base URL - uses environment variable or defaults to localhost
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: '/api/users/register',
    LOGIN: '/api/users/login',
    GOOGLE: '/api/users/google',
    ME: '/api/users/me',
    UPDATE_PROFILE: '/api/users/me',
    CHANGE_PASSWORD: '/api/users/change-password',
    VERIFY_TOKEN: '/api/users/verify-token',
  },
  
  // Interviews
  INTERVIEWS: {
    START: '/api/interviews/start',
    MY_SESSIONS: '/api/interviews/my-sessions',
    END: (sessionId: string) => `/api/interviews/${sessionId}/end`,
    GET_BY_ID: (sessionId: string) => `/api/interviews/${sessionId}`,
  },
  
  // Questions
  QUESTIONS: {
    GET_ALL: '/api/questions',
    CATEGORIES: '/api/questions/categories',
    RANDOM: '/api/questions/random',
    ADD: '/api/questions/add',
    GET_BY_ID: (questionId: string) => `/api/questions/${questionId}`,
  },
  
  // Answers
  ANSWERS: {
    SUBMIT: '/api/answers/submit',
    SESSION: (sessionId: string) => `/api/answers/session/${sessionId}`,
  },
  
  // Health Check
  HEALTH: '/health',
} as const;

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;

// Token storage keys
export const STORAGE_KEYS = {
  TOKEN: 'aiInterviewToken',
  USER: 'aiInterviewUser',
  USER_NAME: 'aiInterviewUserName',
  USER_EMAIL: 'aiInterviewUserEmail',
} as const;
