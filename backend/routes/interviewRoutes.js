/**
 * Interview Routes
 * Handles interview session management
 */

const express = require('express');
const InterviewSession = require('../models/InterviewSession');
const { HTTP_STATUS, SESSION_STATUS } = require('../config/constants');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { startInterviewValidation, userIdParamValidation } = require('../middleware/validation');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @route   POST /api/interviews/start
 * @desc    Start a new interview session
 * @access  Private
 */
router.post('/start', authenticate, startInterviewValidation, asyncHandler(async (req, res) => {
  const { session_type } = req.body;

  const session = new InterviewSession({
    user_id: req.user.id, // Get user from authenticated token
    session_type: session_type || 'general',
    status: SESSION_STATUS.ONGOING,
    started_at: new Date()
  });

  await session.save();

  logger.info(`Interview session started: ${session._id} for user: ${req.user.id}`);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Interview session started',
    data: session
  });
}));

/**
 * @route   GET /api/interviews/my-sessions
 * @desc    Get current user's interview sessions
 * @access  Private
 */
router.get('/my-sessions', authenticate, asyncHandler(async (req, res) => {
  const { status, limit = 10, page = 1 } = req.query;
  
  const query = { user_id: req.user.id };
  
  // Filter by status if provided
  if (status && Object.values(SESSION_STATUS).includes(status)) {
    query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const sessions = await InterviewSession.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await InterviewSession.countDocuments(query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      sessions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

/**
 * @route   GET /api/interviews/:sessionId
 * @desc    Get a specific interview session
 * @access  Private
 */
router.get('/:sessionId', authenticate, asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id // Ensure user owns this session
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: session
  });
}));

/**
 * @route   PUT /api/interviews/:sessionId/end
 * @desc    End an interview session
 * @access  Private
 */
router.put('/:sessionId/end', authenticate, asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  if (session.status === SESSION_STATUS.COMPLETED) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Session is already completed');
  }

  session.status = SESSION_STATUS.COMPLETED;
  session.ended_at = new Date();
  await session.save();

  logger.info(`Interview session ended: ${session._id}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Interview session ended',
    data: session
  });
}));

/**
 * @route   PUT /api/interviews/:sessionId/cancel
 * @desc    Cancel an interview session
 * @access  Private
 */
router.put('/:sessionId/cancel', authenticate, asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  if (session.status === SESSION_STATUS.COMPLETED) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot cancel a completed session');
  }

  session.status = SESSION_STATUS.CANCELLED;
  session.ended_at = new Date();
  await session.save();

  logger.info(`Interview session cancelled: ${session._id}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Interview session cancelled',
    data: session
  });
}));

/**
 * @route   GET /api/interviews/user/:userId
 * @desc    Get interview sessions for a specific user (Admin only)
 * @access  Private (kept for backward compatibility)
 */
router.get('/user/:userId', authenticate, userIdParamValidation, asyncHandler(async (req, res) => {
  // For now, allow users to only see their own sessions
  // In future, add admin check: authorize(USER_ROLES.ADMIN)
  if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Access denied');
  }

  const sessions = await InterviewSession.find({
    user_id: req.params.userId
  }).sort({ createdAt: -1 });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: sessions
  });
}));

module.exports = router;
