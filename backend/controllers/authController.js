/**
 * =============================================================================
 * AUTH CONTROLLER
 * =============================================================================
 * 
 * This controller handles all authentication-related business logic:
 * - User Registration (Signup) - Email/Password
 * - User Login - Email/Password
 * - Google Sign-In - OAuth 2.0
 * - Get Current User Profile
 * - Update User Profile
 * - Change Password
 * 
 * AUTHENTICATION METHODS:
 * 1. Local (Email/Password): Traditional registration and login
 * 2. Google OAuth: Sign in with Google using ID tokens
 * 
 * SECURITY FEATURES:
 * - Passwords are hashed using bcrypt before storage
 * - JWT tokens are used for session management
 * - Tokens expire after 24 hours (configurable)
 * - Passwords are never returned in API responses
 * - Google tokens are verified using Google's OAuth library
 * 
 * @author FYP Team
 * @version 1.1.0 (Added Google OAuth support)
 * =============================================================================
 */

const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { HTTP_STATUS, TOKEN_EXPIRY } = require('../config/constants');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * Initialize Google OAuth2 Client
 * Uses the GOOGLE_CLIENT_ID from environment variables
 */
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * -----------------------------------------------------------------------------
 * HELPER FUNCTION: Generate JWT Token
 * -----------------------------------------------------------------------------
 * Creates a signed JWT token containing user information.
 * 
 * Token Payload:
 * - id: User's MongoDB ObjectId
 * - email: User's email address
 * - role: User's role (user/admin/interviewer)
 * 
 * @param {Object} user - The user object from database
 * @returns {string} Signed JWT token
 * -----------------------------------------------------------------------------
 */
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      role: user.user_role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || TOKEN_EXPIRY.ACCESS }
  );
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Register New User
 * -----------------------------------------------------------------------------
 * Creates a new user account in the database.
 * 
 * PROCESS:
 * 1. Validate input (handled by validation middleware)
 * 2. Check if email already exists
 * 3. Hash password (handled automatically by User model pre-save hook)
 * 4. Save user to database
 * 5. Generate JWT token
 * 6. Return user data (without password) and token
 * 
 * @route   POST /api/users/register
 * @access  Public
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.name - User's full name (required)
 * @param {string} req.body.email - User's email address (required, unique)
 * @param {string} req.body.password - User's password (required, min 6 chars)
 * @param {string} [req.body.role] - User's role (optional, default: 'user')
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with user data and token
 * 
 * @throws {ApiError} 409 - If email already exists
 * @throws {ApiError} 500 - If server error occurs
 * -----------------------------------------------------------------------------
 */
const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  // Step 1: Check if user with this email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  
  if (existingUser) {
    // Return 409 Conflict status for duplicate email
    throw new ApiError(
      HTTP_STATUS.CONFLICT, 
      'An account with this email already exists. Please use a different email or login.'
    );
  }

  // Step 2: Create new user object
  // Note: Password will be automatically hashed by the User model's pre-save hook
  const user = new User({ 
    name: name.trim(), 
    email: email.toLowerCase().trim(), 
    password,
    user_role: role || 'user' // Default role is 'user'
  });

  // Step 3: Save user to database
  await user.save();

  // Step 4: Generate JWT token for immediate login after registration
  const token = generateToken(user);

  // Step 5: Log the registration event
  logger.info(`New user registered: ${email} with role: ${user.user_role}`);

  // Step 6: Send success response
  // Note: toSafeObject() removes the password from the response
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Registration successful! Welcome to AI Interview System.',
    data: {
      user: user.toSafeObject(),
      token
    }
  });
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: User Login
 * -----------------------------------------------------------------------------
 * Authenticates a user and returns a JWT token.
 * 
 * PROCESS:
 * 1. Validate input (handled by validation middleware)
 * 2. Find user by email (including password field)
 * 3. Check if user account is active
 * 4. Compare provided password with hashed password
 * 5. Update last login timestamp
 * 6. Generate JWT token
 * 7. Return user data and token
 * 
 * SECURITY NOTES:
 * - Generic error message is returned for invalid credentials
 *   (doesn't reveal if email exists or password is wrong)
 * - Password comparison uses bcrypt's timing-safe comparison
 * 
 * @route   POST /api/users/login
 * @access  Public
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address (required)
 * @param {string} req.body.password - User's password (required)
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with user data and token
 * 
 * @throws {ApiError} 401 - If credentials are invalid
 * @throws {ApiError} 401 - If account is deactivated
 * -----------------------------------------------------------------------------
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  // Step 1: Find user by email
  // Note: We use findByEmail which includes the password field (normally excluded)
  const user = await User.findByEmail(email.toLowerCase());
  
  // Step 2: Check if user exists
  if (!user) {
    // Generic error message for security (doesn't reveal if email exists)
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED, 
      'Invalid email or password. Please check your credentials.'
    );
  }

  // Step 3: Check if user account is active
  if (!user.isActive) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED, 
      'Your account has been deactivated. Please contact support.'
    );
  }

  // Step 4: Compare passwords using bcrypt
  // comparePassword is a method defined in User model that uses bcrypt.compare()
  const isPasswordValid = await user.comparePassword(password);
  
  if (!isPasswordValid) {
    // Generic error message for security
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED, 
      'Invalid email or password. Please check your credentials.'
    );
  }

  // Step 5: Update last login timestamp
  user.lastLogin = new Date();
  await user.save();

  // Step 6: Generate JWT token
  const token = generateToken(user);

  // Step 7: Log the login event
  logger.info(`User logged in: ${email}`);

  // Step 8: Send success response
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Login successful! Welcome back.',
    data: {
      user: user.toSafeObject(),
      token
    }
  });
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Get Current User Profile
 * -----------------------------------------------------------------------------
 * Retrieves the profile of the currently authenticated user.
 * 
 * NOTE: This is a protected route - requires valid JWT token
 * The user ID is extracted from the token by auth middleware
 * 
 * @route   GET /api/users/me
 * @access  Private (requires authentication)
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - User data from JWT (added by auth middleware)
 * @param {string} req.user.id - User's MongoDB ObjectId
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with user profile data
 * 
 * @throws {ApiError} 404 - If user not found
 * -----------------------------------------------------------------------------
 */
const getProfile = async (req, res) => {
  // req.user is set by the authenticate middleware from JWT payload
  const user = await User.findById(req.user.id);
  
  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User account not found.');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: user.toSafeObject()
  });
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Update User Profile
 * -----------------------------------------------------------------------------
 * Updates the profile of the currently authenticated user.
 * 
 * ALLOWED UPDATES:
 * - name: User's full name
 * 
 * NOT ALLOWED:
 * - email: Cannot be changed (used as identifier)
 * - password: Use change-password endpoint instead
 * - role: Only admin can change roles
 * 
 * @route   PUT /api/users/me
 * @access  Private (requires authentication)
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} [req.body.name] - New name for user
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with updated user data
 * 
 * @throws {ApiError} 404 - If user not found
 * -----------------------------------------------------------------------------
 */
const updateProfile = async (req, res) => {
  const { name } = req.body;
  
  const user = await User.findById(req.user.id);
  
  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User account not found.');
  }

  // Only update allowed fields
  if (name && name.trim()) {
    user.name = name.trim();
  }

  await user.save();

  logger.info(`Profile updated for user: ${user.email}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Profile updated successfully.',
    data: user.toSafeObject()
  });
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Change Password
 * -----------------------------------------------------------------------------
 * Allows authenticated users to change their password.
 * 
 * SECURITY:
 * - Requires current password for verification
 * - New password must meet minimum length requirements
 * - New password is automatically hashed before storage
 * 
 * @route   PUT /api/users/change-password
 * @access  Private (requires authentication)
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.currentPassword - Current password for verification
 * @param {string} req.body.newPassword - New password (min 6 characters)
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response confirming password change
 * 
 * @throws {ApiError} 400 - If required fields missing
 * @throws {ApiError} 401 - If current password is incorrect
 * @throws {ApiError} 404 - If user not found
 * -----------------------------------------------------------------------------
 */
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Validate required fields
  if (!currentPassword || !newPassword) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST, 
      'Both current password and new password are required.'
    );
  }

  // Validate new password length
  if (newPassword.length < 6) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST, 
      'New password must be at least 6 characters long.'
    );
  }

  // Get user with password field
  const user = await User.findById(req.user.id).select('+password');
  
  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User account not found.');
  }

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  
  if (!isPasswordValid) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED, 
      'Current password is incorrect. Please try again.'
    );
  }

  // Update password (will be hashed by pre-save middleware)
  user.password = newPassword;
  await user.save();

  logger.info(`Password changed for user: ${user.email}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Password changed successfully. Please use your new password for future logins.'
  });
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Verify Token
 * -----------------------------------------------------------------------------
 * Verifies if the provided JWT token is valid.
 * Useful for frontend to check if user is still logged in.
 * 
 * @route   GET /api/users/verify-token
 * @access  Private (requires authentication)
 * 
/**
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response confirming token validity
 * -----------------------------------------------------------------------------
 */
const verifyToken = async (req, res) => {
  // If we reach here, the token is valid (auth middleware passed)
  const user = await User.findById(req.user.id);
  
  if (!user || !user.isActive) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired token.');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Token is valid.',
    data: {
      user: user.toSafeObject()
    }
  });
};

/**
 * =============================================================================
 * GOOGLE OAUTH AUTHENTICATION
 * =============================================================================
 */

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Google Sign-In
 * -----------------------------------------------------------------------------
 * Authenticates a user using Google OAuth 2.0 ID token.
 * 
 * HOW IT WORKS:
 * 1. Frontend uses Google Sign-In button to get an ID token from Google
 * 2. Frontend sends this ID token to this endpoint
 * 3. Backend verifies the token with Google's servers
 * 4. If valid, extracts user info (email, name, picture)
 * 5. Finds existing user or creates new user in database
 * 6. Issues our own JWT token for subsequent API calls
 * 
 * GOOGLE TOKEN VERIFICATION:
 * - Uses google-auth-library to verify the ID token
 * - Validates the token's signature
 * - Checks that the token was issued for our app (audience check)
 * - Extracts user payload (email, name, sub, picture)
 * 
 * USER CREATION:
 * - If user exists with Google ID: Login
 * - If user exists with same email: Link Google account
 * - If new user: Create account with Google info
 * 
 * @route   POST /api/users/google
 * @access  Public
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.idToken - Google ID token from frontend
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with user data and JWT token
 * 
 * @throws {ApiError} 400 - If ID token is missing
 * @throws {ApiError} 401 - If Google token is invalid or expired
 * @throws {ApiError} 500 - If database error occurs
 * 
 * @example
 * // Frontend sends:
 * POST /api/users/google
 * {
 *   "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 * 
 * // Backend responds:
 * {
 *   "success": true,
 *   "message": "Google sign-in successful!",
 *   "data": {
 *     "user": { ... },
 *     "token": "eyJhbGciOiJIUzI1NiIs...",
 *     "isNewUser": false
 *   }
 * }
 * -----------------------------------------------------------------------------
 */
const googleSignIn = async (req, res) => {
  const { idToken } = req.body;

  // Step 1: Validate that ID token is provided
  if (!idToken) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Google ID token is required. Please provide the token from Google Sign-In.'
    );
  }

  // Step 2: Verify the Google ID token
  let payload;
  try {
    /**
     * Verify the ID token using Google's OAuth2Client
     * 
     * This verification:
     * - Checks the token's cryptographic signature
     * - Verifies the token hasn't expired
     * - Confirms the token was issued for our application (audience)
     */
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID // Ensures token is for our app
    });
    
    /**
     * Extract the payload from the verified token
     * Payload contains:
     * - sub: Google's unique user ID
     * - email: User's email address
     * - email_verified: Whether email is verified by Google
     * - name: User's full name
     * - picture: URL to profile picture
     * - given_name: First name
     * - family_name: Last name
     */
    payload = ticket.getPayload();
    
  } catch (error) {
    // Token verification failed
    logger.error(`Google token verification failed: ${error.message}`);
    
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Invalid or expired Google token. Please try signing in again.'
    );
  }

  // Step 3: Extract user information from Google's payload
  const googleProfile = {
    googleId: payload.sub,           // Google's unique user ID
    email: payload.email,            // User's email
    name: payload.name || 'Google User', // Full name (fallback if not provided)
    picture: payload.picture         // Profile picture URL
  };

  // Log for debugging (remove in production)
  logger.info(`Google Sign-In attempt for: ${googleProfile.email}`);

  // Step 4: Find or create user in our database
  /**
   * findOrCreateFromGoogle handles three scenarios:
   * 1. User exists with this Google ID -> Return existing user
   * 2. User exists with same email (local auth) -> Link Google account
   * 3. New user -> Create new account with Google info
   */
  const { user, isNewUser } = await User.findOrCreateFromGoogle(googleProfile);

  // Step 5: Check if user account is active
  if (!user.isActive) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Your account has been deactivated. Please contact support.'
    );
  }

  // Step 6: Generate our own JWT token
  /**
   * Even though user authenticated with Google, we issue our own JWT
   * This allows us to:
   * - Control token expiration
   * - Include custom claims (role, etc.)
   * - Use the same token format for all auth methods
   */
  const token = generateToken(user);

  // Step 7: Log the event
  if (isNewUser) {
    logger.info(`New user registered via Google: ${googleProfile.email}`);
  } else {
    logger.info(`User logged in via Google: ${googleProfile.email}`);
  }

  // Step 8: Send success response
  res.status(isNewUser ? HTTP_STATUS.CREATED : HTTP_STATUS.OK).json({
    success: true,
    message: isNewUser 
      ? 'Account created successfully with Google! Welcome to AI Interview System.'
      : 'Google sign-in successful! Welcome back.',
    data: {
      user: user.toSafeObject(),
      token,
      isNewUser,
      authProvider: 'google'
    }
  });
};

// Export all controller functions
module.exports = {
  register,
  login,
  googleSignIn,
  getProfile,
  updateProfile,
  changePassword,
  verifyToken
};
