/**
 * =============================================================================
 * USER ROUTES
 * =============================================================================
 * 
 * This file defines all authentication and user-related API endpoints.
 * 
 * ROUTE STRUCTURE:
 * - Public Routes (no authentication required):
 *   - POST /register - Create new user account (email/password)
 *   - POST /login    - Authenticate with email/password
 *   - POST /google   - Authenticate with Google OAuth
 * 
 * - Protected Routes (requires valid JWT token):
 *   - GET  /me              - Get current user profile
 *   - PUT  /me              - Update current user profile
 *   - PUT  /change-password - Change user password
 *   - GET  /verify-token    - Verify if token is still valid
 * 
 * AUTHENTICATION METHODS:
 * 1. Email/Password: Traditional login with hashed passwords
 * 2. Google OAuth: Sign in with Google ID token
 * 
 * MIDDLEWARE CHAIN:
 * 1. Express Router receives request
 * 2. Validation middleware validates input
 * 3. Auth middleware verifies JWT (for protected routes)
 * 4. asyncHandler wraps controller for error handling
 * 5. Controller handles business logic
 * 6. Response sent to client
 * 
 * @author FYP Team
 * @version 1.1.0 (Added Google OAuth)
 * =============================================================================
 */

const express = require('express');
const router = express.Router();

// Import controller functions
const {
  register,
  login,
  googleSignIn,
  getProfile,
  updateProfile,
  changePassword,
  verifyToken
} = require('../controllers/authController');

// Import middleware
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validation');

/**
 * =============================================================================
 * PUBLIC ROUTES - No Authentication Required
 * =============================================================================
 */

/**
 * @route   POST /api/users/register
 * @desc    Register a new user account
 * @access  Public
 * 
 * @body    {string} name     - User's full name (required, 2-50 chars)
 * @body    {string} email    - User's email (required, valid format)
 * @body    {string} password - User's password (required, min 6 chars)
 * @body    {string} [role]   - User role: 'user', 'admin', 'interviewer'
 * 
 * @returns {Object} { success, message, data: { user, token } }
 * 
 * @example
 * // Request
 * POST /api/users/register
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "password123"
 * }
 * 
 * // Response (201 Created)
 * {
 *   "success": true,
 *   "message": "Registration successful! Welcome to AI Interview System.",
 *   "data": {
 *     "user": {
 *       "_id": "...",
 *       "name": "John Doe",
 *       "email": "john@example.com",
 *       "user_role": "user",
 *       "isActive": true,
 *       "createdAt": "2026-02-04T..."
 *     },
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
 *   }
 * }
 */
router.post('/register', registerValidation, asyncHandler(register));

/**
 * @route   POST /api/users/login
 * @desc    Authenticate user and get JWT token
 * @access  Public
 * 
 * @body    {string} email    - User's email (required)
 * @body    {string} password - User's password (required)
 * 
 * @returns {Object} { success, message, data: { user, token } }
 * 
 * @example
 * // Request
 * POST /api/users/login
 * {
 *   "email": "john@example.com",
 *   "password": "password123"
 * }
 * 
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Login successful! Welcome back.",
 *   "data": {
 *     "user": {
 *       "_id": "...",
 *       "name": "John Doe",
 *       "email": "john@example.com",
 *       "user_role": "user",
 *       "lastLogin": "2026-02-04T..."
 *     },
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
 *   }
 * }
 * 
 * // Error Response (401 Unauthorized)
 * {
 *   "success": false,
 *   "message": "Invalid email or password. Please check your credentials."
 * }
 */
router.post('/login', loginValidation, asyncHandler(login));

/**
 * =============================================================================
 * GOOGLE OAUTH - Sign in with Google
 * =============================================================================
 */

/**
 * @route   POST /api/users/google
 * @desc    Authenticate user with Google ID token
 * @access  Public
 * 
 * @body    {string} idToken - Google ID token from frontend Sign-In button
 * 
 * @returns {Object} { success, message, data: { user, token, isNewUser, authProvider } }
 * 
 * HOW TO GET THE ID TOKEN (Frontend):
 * 1. User clicks "Sign in with Google" button
 * 2. Google Sign-In popup appears
 * 3. User selects their Google account
 * 4. Frontend receives credential response
 * 5. Extract idToken from credential.credential
 * 6. Send idToken to this endpoint
 * 
 * @example
 * // Frontend code (React with @react-oauth/google)
 * // import { GoogleLogin } from '@react-oauth/google';
 * //
 * // <GoogleLogin
 * //   onSuccess={(credentialResponse) => {
 * //     fetch('/api/users/google', {
 * //       method: 'POST',
 * //       headers: { 'Content-Type': 'application/json' },
 * //       body: JSON.stringify({ idToken: credentialResponse.credential })
 * //     });
 * //   }}
 * // />
 * 
 * // Request
 * POST /api/users/google
 * {
 *   "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 * 
 * // Response (200 OK - Existing User)
 * {
 *   "success": true,
 *   "message": "Google sign-in successful! Welcome back.",
 *   "data": {
 *     "user": {
 *       "_id": "...",
 *       "name": "John Doe",
 *       "email": "john@gmail.com",
 *       "profilePicture": "https://lh3.googleusercontent.com/...",
 *       "authProvider": "google",
 *       "isEmailVerified": true
 *     },
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
 *     "isNewUser": false,
 *     "authProvider": "google"
 *   }
 * }
 * 
 * // Response (201 Created - New User)
 * {
 *   "success": true,
 *   "message": "Account created successfully with Google!",
 *   "data": {
 *     "user": { ... },
 *     "token": "...",
 *     "isNewUser": true,
 *     "authProvider": "google"
 *   }
 * }
 * 
 * // Error Response (401 Unauthorized)
 * {
 *   "success": false,
 *   "message": "Invalid or expired Google token. Please try signing in again."
 * }
 */
router.post('/google', asyncHandler(googleSignIn));

/**
 * =============================================================================
 * PROTECTED ROUTES - Authentication Required
 * =============================================================================
 * 
 * All routes below require a valid JWT token in the Authorization header:
 * Authorization: Bearer <your_jwt_token>
 */

/**
 * @route   GET /api/users/me
 * @desc    Get current authenticated user's profile
 * @access  Private
 * 
 * @header  {string} Authorization - Bearer <token>
 * 
 * @returns {Object} { success, data: { user } }
 * 
 * @example
 * // Request
 * GET /api/users/me
 * Headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIs..." }
 * 
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "...",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "user_role": "user",
 *     "isActive": true,
 *     "createdAt": "...",
 *     "lastLogin": "..."
 *   }
 * }
 */
router.get('/me', authenticate, asyncHandler(getProfile));

/**
 * @route   PUT /api/users/me
 * @desc    Update current user's profile
 * @access  Private
 * 
 * @header  {string} Authorization - Bearer <token>
 * @body    {string} [name] - New name for user
 * 
 * @returns {Object} { success, message, data: { user } }
 * 
 * @example
 * // Request
 * PUT /api/users/me
 * Headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIs..." }
 * Body: { "name": "John Smith" }
 * 
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Profile updated successfully.",
 *   "data": { ... }
 * }
 */
router.put('/me', authenticate, asyncHandler(updateProfile));

/**
 * @route   PUT /api/users/change-password
 * @desc    Change current user's password
 * @access  Private
 * 
 * @header  {string} Authorization - Bearer <token>
 * @body    {string} currentPassword - Current password for verification
 * @body    {string} newPassword     - New password (min 6 chars)
 * 
 * @returns {Object} { success, message }
 * 
 * @example
 * // Request
 * PUT /api/users/change-password
 * Headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIs..." }
 * Body: {
 *   "currentPassword": "oldpass123",
 *   "newPassword": "newpass456"
 * }
 * 
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Password changed successfully."
 * }
 */
router.put('/change-password', authenticate, asyncHandler(changePassword));

/**
 * @route   GET /api/users/verify-token
 * @desc    Verify if the provided JWT token is valid
 * @access  Private
 * 
 * @header  {string} Authorization - Bearer <token>
 * 
 * @returns {Object} { success, message, data: { user } }
 * 
 * @example
 * // Request
 * GET /api/users/verify-token
 * Headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIs..." }
 * 
 * // Response (200 OK) - Token is valid
 * {
 *   "success": true,
 *   "message": "Token is valid.",
 *   "data": { "user": { ... } }
 * }
 * 
 * // Response (401 Unauthorized) - Token is invalid/expired
 * {
 *   "success": false,
 *   "message": "Invalid token."
 * }
 */
router.get('/verify-token', authenticate, asyncHandler(verifyToken));

// Export the router
module.exports = router;
