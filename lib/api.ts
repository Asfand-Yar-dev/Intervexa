/**
 * =============================================================================
 * API Service - Backend Integration
 * =============================================================================
 * 
 * This service handles all API calls to the backend.
 * It provides a clean interface for authentication, interviews, and other features.
 * 
 * Features:
 * - Automatic token injection in headers
 * - Centralized error handling
 * - Type-safe responses
 * - Request/Response logging in development
 */

import { API_BASE_URL, API_ENDPOINTS, STORAGE_KEYS, REQUEST_TIMEOUT } from './api-config';

// =============================================================================
// TYPES
// =============================================================================

export interface User {
  _id: string;
  name: string;
  email: string;
  user_role: string;
  authProvider?: 'local' | 'google';
  profilePicture?: string;
  isEmailVerified?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    isNewUser?: boolean;
    authProvider?: string;
  };
}

export interface InterviewSession {
  _id: string;
  user_id: string;
  session_type: string;
  status: 'pending' | 'ongoing' | 'completed' | 'cancelled';
  start_time: string;
  end_time?: string;
  questions?: string[];
  overall_score?: number;
  createdAt: string;
}

export interface Question {
  _id: string;
  questionText: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  expectedAnswer?: string;
  keywords?: string[];
  isActive: boolean;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get stored auth token
 */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

/**
 * Store auth data after login/signup
 */
function storeAuthData(user: User, token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.USER_NAME, user.name);
  localStorage.setItem(STORAGE_KEYS.USER_EMAIL, user.email);
}

/**
 * Clear auth data on logout
 */
export function clearAuthData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.USER_NAME);
  localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
}

/**
 * Get stored user data
 */
export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(STORAGE_KEYS.USER);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

// =============================================================================
// API REQUEST HANDLER
// =============================================================================

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

/**
 * Make an API request with proper headers and error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    requireAuth = false,
  } = options;

  // Build headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add auth token if required or available
  const token = getToken();
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  } else if (requireAuth) {
    throw new Error('Authentication required. Please login.');
  }

  // Build request config
  const config: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: 'include',
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}${endpoint}`;

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${method} ${url}`, body ? { body } : '');
  }

  try {
    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    config.signal = controller.signal;

    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    const data = await response.json();

    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] Response:`, data);
    }

    // Handle error responses
    if (!response.ok || data.success === false) {
      const errorMessage = data.message || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please check your connection.');
      }
      throw error;
    }
    throw new Error('An unexpected error occurred');
  }
}

// =============================================================================
// AUTH API
// =============================================================================

export const authApi = {
  /**
   * Register a new user
   */
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: { name, email, password },
    });
    
    // Store auth data on successful registration
    if (response.success && response.data) {
      storeAuthData(response.data.user, response.data.token);
    }
    
    return response;
  },

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: { email, password },
    });
    
    // Store auth data on successful login
    if (response.success && response.data) {
      storeAuthData(response.data.user, response.data.token);
    }
    
    return response;
  },

  /**
   * Login with Google (send ID token from Google Sign-In)
   */
  async googleSignIn(idToken: string): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>(API_ENDPOINTS.AUTH.GOOGLE, {
      method: 'POST',
      body: { idToken },
    });
    
    // Store auth data on successful Google sign-in
    if (response.success && response.data) {
      storeAuthData(response.data.user, response.data.token);
    }
    
    return response;
  },

  /**
   * Get current user profile
   */
  async getProfile(): Promise<{ success: boolean; data: User }> {
    return apiRequest(API_ENDPOINTS.AUTH.ME, { requireAuth: true });
  },

  /**
   * Update user profile
   */
  async updateProfile(data: { name?: string }): Promise<{ success: boolean; data: User }> {
    const response = await apiRequest<{ success: boolean; message: string; data: User }>(
      API_ENDPOINTS.AUTH.UPDATE_PROFILE,
      {
        method: 'PUT',
        body: data,
        requireAuth: true,
      }
    );
    
    // Update stored user data
    if (response.success && response.data) {
      const token = getToken();
      if (token) {
        storeAuthData(response.data, token);
      }
    }
    
    return response;
  },

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return apiRequest(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      method: 'PUT',
      body: { currentPassword, newPassword },
      requireAuth: true,
    });
  },

  /**
   * Verify if current token is valid
   */
  async verifyToken(): Promise<{ success: boolean; data: { user: User } }> {
    return apiRequest(API_ENDPOINTS.AUTH.VERIFY_TOKEN, { requireAuth: true });
  },

  /**
   * Logout - clear all auth data
   */
  logout(): void {
    clearAuthData();
  },
};

// =============================================================================
// INTERVIEW API
// =============================================================================

export const interviewApi = {
  /**
   * Start a new interview session
   */
  async startSession(sessionType: string = 'technical'): Promise<{
    success: boolean;
    message: string;
    data: { session: InterviewSession };
  }> {
    return apiRequest(API_ENDPOINTS.INTERVIEWS.START, {
      method: 'POST',
      body: { session_type: sessionType },
      requireAuth: true,
    });
  },

  /**
   * Get user's interview sessions
   */
  async getMySessions(params?: {
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<{
    success: boolean;
    data: {
      sessions: InterviewSession[];
      pagination: { total: number; page: number; limit: number };
    };
  }> {
    let endpoint = API_ENDPOINTS.INTERVIEWS.MY_SESSIONS;
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.append('status', params.status);
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.page) searchParams.append('page', params.page.toString());
      const queryString = searchParams.toString();
      if (queryString) endpoint += `?${queryString}`;
    }
    return apiRequest(endpoint, { requireAuth: true });
  },

  /**
   * End an interview session
   */
  async endSession(sessionId: string): Promise<{
    success: boolean;
    message: string;
    data: { session: InterviewSession };
  }> {
    return apiRequest(API_ENDPOINTS.INTERVIEWS.END(sessionId), {
      method: 'PUT',
      requireAuth: true,
    });
  },
};

// =============================================================================
// QUESTIONS API
// =============================================================================

export const questionsApi = {
  /**
   * Get all questions with optional filters
   */
  async getAll(params?: {
    category?: string;
    difficulty?: string;
    search?: string;
    limit?: number;
    page?: number;
  }): Promise<{
    success: boolean;
    data: {
      questions: Question[];
      pagination: { total: number; page: number; limit: number };
    };
  }> {
    let endpoint = API_ENDPOINTS.QUESTIONS.GET_ALL;
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.category) searchParams.append('category', params.category);
      if (params.difficulty) searchParams.append('difficulty', params.difficulty);
      if (params.search) searchParams.append('search', params.search);
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.page) searchParams.append('page', params.page.toString());
      const queryString = searchParams.toString();
      if (queryString) endpoint += `?${queryString}`;
    }
    return apiRequest(endpoint);
  },

  /**
   * Get question categories
   */
  async getCategories(): Promise<{ success: boolean; data: { categories: string[] } }> {
    return apiRequest(API_ENDPOINTS.QUESTIONS.CATEGORIES);
  },

  /**
   * Get random questions for an interview
   */
  async getRandom(count: number = 5, params?: {
    category?: string;
    difficulty?: string;
  }): Promise<{ success: boolean; data: { questions: Question[] } }> {
    let endpoint = `${API_ENDPOINTS.QUESTIONS.RANDOM}?count=${count}`;
    if (params?.category) endpoint += `&category=${params.category}`;
    if (params?.difficulty) endpoint += `&difficulty=${params.difficulty}`;
    return apiRequest(endpoint, { requireAuth: true });
  },

  /**
   * Add a new question (authenticated)
   */
  async addQuestion(data: {
    questionText: string;
    category: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    expectedAnswer?: string;
    keywords?: string[];
  }): Promise<{ success: boolean; data: { question: Question } }> {
    return apiRequest(API_ENDPOINTS.QUESTIONS.ADD, {
      method: 'POST',
      body: data,
      requireAuth: true,
    });
  },
};

// =============================================================================
// ANSWERS API
// =============================================================================

export const answersApi = {
  /**
   * Submit an answer for a question
   */
  async submit(data: {
    question_id: string;
    session_id: string;
    answer_text: string;
    audio_url?: string;
    video_url?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: { answer: unknown };
  }> {
    return apiRequest(API_ENDPOINTS.ANSWERS.SUBMIT, {
      method: 'POST',
      body: data,
      requireAuth: true,
    });
  },

  /**
   * Get all answers for a session
   */
  async getSessionAnswers(sessionId: string): Promise<{
    success: boolean;
    data: { answers: unknown[] };
  }> {
    return apiRequest(API_ENDPOINTS.ANSWERS.SESSION(sessionId), {
      requireAuth: true,
    });
  },
};

// =============================================================================
// HEALTH CHECK
// =============================================================================

export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.HEALTH}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}

// =============================================================================
// COMBINED API EXPORT
// =============================================================================

export const api = {
  auth: authApi,
  interviews: interviewApi,
  questions: questionsApi,
  answers: answersApi,
  checkHealth: checkApiHealth,
  clearAuth: clearAuthData,
  getStoredUser,
  isAuthenticated,
};

export default api;
